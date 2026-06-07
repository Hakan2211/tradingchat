// In-memory registry of active live sessions (one per room).
//
// Deliberately NOT persisted to the database: the app is a single long-lived
// Node process (like the `onlineUsers` presence map in server/server.ts), and
// a server restart simply means "not live" — the broadcaster clicks Go Live
// again. A periodic sweep in server/server.ts reconciles this map against
// LiveKit in case a broadcaster's tab dies without ending the session.
//
// `remember` is required (not a plain module-level Map) because in dev the
// tsx server graph and the Vite SSR graph are separate module registries that
// only share `globalThis` — same trick that keeps `prisma` a singleton.

import { remember } from "@epic-web/remember";
import type {
  LiveSessionMode,
  PublicLiveSession,
} from "#/components/live/types";

export type LiveSession = PublicLiveSession & {
  // Sweep bookkeeping (server/server.ts) — not sent to clients.
  missedSweeps: number;
};

export type { LiveSessionMode, PublicLiveSession };

export const liveSessions = remember(
  "live-sessions",
  () => new Map<string, LiveSession>()
);

export function publicSession(session: LiveSession): PublicLiveSession {
  const { missedSweeps: _missedSweeps, ...pub } = session;
  return pub;
}

export function snapshotLiveSessions(): Record<string, PublicLiveSession> {
  return Object.fromEntries(
    [...liveSessions.entries()].map(([roomId, session]) => [
      roomId,
      publicSession(session),
    ])
  );
}
