/**
 * One-off purge of OLD chat messages.
 *
 * Hard-deletes every Message created BEFORE a cutoff date. The Message table,
 * all Rooms, and chat itself are untouched — only old message *rows* are
 * removed, so the app keeps working and people keep chatting normally.
 *
 * What it handles that a naive `deleteMany` does not:
 *   1. REPLY CHAINS. `Message.replyToId` is a self-FK with ON DELETE NO ACTION.
 *      A kept (recent) message that replies to a deleted (old) one would cause
 *      a foreign-key error. We null those dangling replyToId links first.
 *   2. ORPHANED IMAGES. Deleting a Message cascades its ChatImage row, but the
 *      actual file in Cloudflare R2 is NOT removed. We collect those objectKeys
 *      and delete them from R2 too (skip with --keep-images).
 *   3. DISK RECLAIM. SQLite doesn't shrink the file on DELETE, so we VACUUM.
 *   (Bookmarks cascade automatically via ON DELETE CASCADE.)
 *
 * SAFE BY DEFAULT: this is a dry run unless you pass `--confirm`.
 *
 *   # Dry run (shows keep/delete counts + the exact date boundary, deletes nothing):
 *   DATABASE_URL="<PROD_URL>" npx tsx prisma/purge-old-messages.ts
 *
 *   # Actually delete (everything BEFORE 2026-06-07, i.e. keep yesterday on):
 *   DATABASE_URL="<PROD_URL>" npx tsx prisma/purge-old-messages.ts --confirm
 *
 * Flags:
 *   --confirm            Perform the deletion (otherwise dry run).
 *   --before=YYYY-MM-DD  Override the cutoff (UTC midnight). Default below.
 *   --keep-images        Do NOT delete image files from R2 (DB rows still go).
 *
 * !!! BACK UP THE DB FIRST !!! For SQLite that's just copying the file, e.g.
 *   cp /app/prisma/data/<your>.db /app/prisma/data/backup-$(date +%F).db
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default cutoff: keep everything from 2026-06-07 (yesterday) onward, delete
// everything created strictly before it. UTC midnight — verify the boundary in
// the dry-run output and adjust with --before=YYYY-MM-DD if your timezone shifts it.
const DEFAULT_CUTOFF = '2026-06-07';

function getCutoff(): Date {
  const arg = process.argv.find((a) => a.startsWith('--before='));
  const day = arg ? arg.split('=')[1] : DEFAULT_CUTOFF;
  const cutoff = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(cutoff.getTime())) {
    throw new Error(`Invalid --before date: "${day}". Use YYYY-MM-DD.`);
  }
  return cutoff;
}

const fmt = (d: Date | null | undefined) =>
  d ? d.toISOString().replace('.000Z', 'Z') : '—';

async function deleteFromR2(objectKeys: string[]) {
  if (objectKeys.length === 0) return { deleted: 0 };
  // Imported lazily so a dry run never needs R2 credentials.
  const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('R2 credentials missing — set them or pass --keep-images.');
  }
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  let deleted = 0;
  const CONCURRENCY = 10;
  for (let i = 0; i < objectKeys.length; i += CONCURRENCY) {
    const batch = objectKeys.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (Key) => {
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key }));
          deleted++;
        } catch (err) {
          console.error(`  [R2] failed to delete ${Key}:`, err);
        }
      })
    );
    if (i + CONCURRENCY < objectKeys.length) {
      console.log(`  [R2] ${Math.min(i + CONCURRENCY, objectKeys.length)}/${objectKeys.length}...`);
    }
  }
  return { deleted };
}

async function main() {
  const confirm = process.argv.includes('--confirm');
  const keepImages = process.argv.includes('--keep-images');
  const cutoff = getCutoff();

  console.log(`\nDatabase: ${process.env.DATABASE_URL ?? '(DATABASE_URL not set!)'}`);
  console.log(`Cutoff:   delete messages created BEFORE ${fmt(cutoff)} (keep that moment onward)\n`);

  const oldWhere = { createdAt: { lt: cutoff } };

  const [total, toDelete, newestDeleted, oldestKept, newestKept, replyLinks, images] =
    await Promise.all([
      prisma.message.count(),
      prisma.message.count({ where: oldWhere }),
      prisma.message.findFirst({ where: oldWhere, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      prisma.message.findFirst({ where: { createdAt: { gte: cutoff } }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      prisma.message.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      // Reply links from ANY message (kept or doomed) pointing at a doomed one.
      prisma.message.count({ where: { replyTo: { is: { createdAt: { lt: cutoff } } } } }),
      prisma.chatImage.count({ where: { message: { createdAt: { lt: cutoff } } } }),
    ]);

  const toKeep = total - toDelete;
  console.log(`Total messages:       ${total}`);
  console.log(`  → will DELETE:      ${toDelete}`);
  console.log(`  → will KEEP:        ${toKeep}`);
  console.log(`Boundary check:`);
  console.log(`  newest DELETED msg: ${fmt(newestDeleted?.createdAt)}`);
  console.log(`  oldest KEPT msg:    ${fmt(oldestKept?.createdAt)}`);
  console.log(`  newest msg overall: ${fmt(newestKept?.createdAt)}`);
  console.log(`Reply links to sever: ${replyLinks}`);
  console.log(`Image files in R2:    ${images}${keepImages ? ' (will be LEFT, --keep-images)' : ' (will be deleted)'}\n`);

  if (toDelete === 0) {
    console.log('Nothing to delete. Done.\n');
    return;
  }

  if (!confirm) {
    console.log(
      `DRY RUN — nothing was deleted. Re-read the boundary check above, then ` +
        `re-run with --confirm to permanently delete the ${toDelete} message(s)` +
        `${keepImages ? '' : ` and ${images} R2 image file(s)`}.\n`
    );
    return;
  }

  // 1. Sever dangling reply links so the NO ACTION self-FK can't block the delete.
  const severed = await prisma.message.updateMany({
    where: { replyTo: { is: { createdAt: { lt: cutoff } } } },
    data: { replyToId: null },
  });
  console.log(`Severed ${severed.count} reply link(s).`);

  // 2. Collect R2 object keys BEFORE the rows (and their ChatImage rows) vanish.
  let objectKeys: string[] = [];
  if (!keepImages) {
    objectKeys = (
      await prisma.chatImage.findMany({
        where: { message: { createdAt: { lt: cutoff } } },
        select: { objectKey: true },
      })
    ).map((r) => r.objectKey);
  }

  // 3. Delete the messages (cascades ChatImage + Bookmark rows automatically).
  const deleted = await prisma.message.deleteMany({ where: oldWhere });
  console.log(`Deleted ${deleted.count} message row(s) (+ cascaded images/bookmarks).`);

  // 4. Delete the now-orphaned image files from R2.
  if (!keepImages && objectKeys.length) {
    const { deleted: r2Deleted } = await deleteFromR2(objectKeys);
    console.log(`Deleted ${r2Deleted}/${objectKeys.length} image file(s) from R2.`);
  }

  // 5. Reclaim disk space (SQLite doesn't shrink the file on its own).
  // Non-fatal: VACUUM needs an exclusive lock and can fail under live traffic.
  // The rows are already deleted at this point either way — you can VACUUM later.
  console.log('Running VACUUM to reclaim disk space...');
  try {
    await prisma.$executeRawUnsafe('VACUUM');
    console.log('VACUUM done.');
  } catch (err) {
    console.warn(
      'VACUUM skipped (database busy?). Rows ARE deleted; re-run VACUUM during ' +
        'low traffic to reclaim disk:',
      err instanceof Error ? err.message : err
    );
  }

  console.log(`\n✅ Purge complete. Kept ${toKeep} message(s).\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
