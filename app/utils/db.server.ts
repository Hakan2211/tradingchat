import { remember } from '@epic-web/remember';
import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';

const prisma = remember('prisma', () => {
  // NOTE: if you change anything in this function you'll need to restart
  // the dev server to see your changes.
  const logThreshold = 20;

  const client = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  });
  client.$on('query', async (e: any) => {
    if (e.duration < logThreshold) return;
    const color =
      e.duration < logThreshold * 1.1
        ? 'green'
        : e.duration < logThreshold * 1.2
        ? 'blue'
        : e.duration < logThreshold * 1.3
        ? 'yellow'
        : e.duration < logThreshold * 1.4
        ? 'redBright'
        : 'red';
    const dur = chalk[color](`${e.duration}ms`);
    console.info(`prisma:query - ${dur} - ${e.query}`);
  });
  client.$connect();

  // SQLite pragmas. The database ships in the default `delete` journal mode,
  // where a writer blocks every reader and vice versa. That was survivable when
  // writes were only people sending chat messages; the news poller writes far
  // more often and from a background timer, so a poll cycle could stall a page
  // load. WAL lets readers keep reading during a write.
  //
  // `busy_timeout` is the other half: with two writers (chat and the poller)
  // SQLite returns SQLITE_BUSY immediately by default rather than waiting, and
  // that surfaces as a random failed insert. Five seconds of waiting is much
  // cheaper than a lost message.
  //
  // journal_mode is persistent once set on the file; busy_timeout is per
  // connection, so both are re-applied on every boot. Fire-and-forget, matching
  // the `$connect()` above — a pragma failure must not stop the app booting.
  void (async () => {
    try {
      // queryRawUnsafe, not executeRawUnsafe: `PRAGMA journal_mode` returns a row.
      const [result] = (await client.$queryRawUnsafe(
        'PRAGMA journal_mode = WAL'
      )) as Array<{ journal_mode?: string }>;
      await client.$queryRawUnsafe('PRAGMA busy_timeout = 5000');
      const mode = result?.journal_mode ?? 'unknown';
      if (mode.toLowerCase() !== 'wal') {
        console.warn(`[db] journal_mode is "${mode}", expected "wal".`);
      }
    } catch (error) {
      console.warn('[db] could not apply SQLite pragmas:', error);
    }
  })();

  return client;
});

export { prisma };
