/**
 * One-off cleanup of bot / unpaid accounts.
 *
 * Deletes every User that has NO subscription, EXCEPT:
 *   - users with an `admin` or `moderator` role, and
 *   - the protected owner emails below.
 *
 * Related rows (password, sessions, images, trades, bookmarks, etc.) are
 * removed automatically via `onDelete: Cascade`. Chat messages are kept but
 * their author is set to null (the relation is `onDelete: SetNull`).
 *
 * SAFE BY DEFAULT: this is a dry run unless you pass `--confirm`.
 *
 *   # Dry run (lists who WOULD be deleted, deletes nothing):
 *   DATABASE_URL="<PROD_URL>" npx tsx prisma/cleanup-bots.ts
 *
 *   # Actually delete:
 *   DATABASE_URL="<PROD_URL>" npx tsx prisma/cleanup-bots.ts --confirm
 *
 * Also purges expired pending Registration rows.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Roles that must never be deleted.
const PROTECTED_ROLES = ['admin', 'moderator'];
// Extra safety net: never delete these accounts regardless of role/subscription.
const PROTECTED_EMAILS = ['hbilgic1992@gmail.com'];

const where: Prisma.UserWhereInput = {
  subscription: { is: null },
  roles: { none: { name: { in: PROTECTED_ROLES } } },
  email: { notIn: PROTECTED_EMAILS },
};

async function main() {
  const confirm = process.argv.includes('--confirm');

  const totalUsers = await prisma.user.count();
  const victims = await prisma.user.findMany({
    where,
    select: {
      email: true,
      username: true,
      name: true,
      createdAt: true,
      roles: { select: { name: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(
    `\nTotal users: ${totalUsers}. Candidates for deletion (no subscription, ` +
      `not ${PROTECTED_ROLES.join('/')}, not protected email): ${victims.length}\n`
  );
  for (const u of victims) {
    const created = u.createdAt.toISOString().slice(0, 10);
    const roles = u.roles.map((r) => r.name).join(',') || '—';
    console.log(
      `  - ${u.email}  @${u.username ?? '—'}  "${u.name ?? ''}"  ` +
        `created ${created}  msgs:${u._count.messages}  roles:[${roles}]`
    );
  }

  // Always report (and, when confirmed, purge) stale pending registrations.
  const expiredRegs = await prisma.registration.count({
    where: { expiresAt: { lt: new Date() } },
  });
  console.log(`\nExpired pending registrations: ${expiredRegs}`);

  if (!confirm) {
    console.log(
      `\nDRY RUN — nothing was deleted. Re-run with --confirm to delete ` +
        `the ${victims.length} user(s) above${
          expiredRegs ? ` and ${expiredRegs} expired registration(s)` : ''
        }.\n`
    );
    return;
  }

  const deletedUsers = await prisma.user.deleteMany({ where });
  const deletedRegs = await prisma.registration.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  console.log(
    `\n✅ Deleted ${deletedUsers.count} user(s) and ${deletedRegs.count} ` +
      `expired registration(s).\n`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
