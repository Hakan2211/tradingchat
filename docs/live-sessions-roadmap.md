# Live Sessions — Roadmap & Ideas

Follow-ups for the live broadcast feature shipped in `0f58757` (2026-06-07).
Each item has enough context to be picked up cold — point Claude (or yourself)
at this file and say which one to build.

## How it works today (context)

- Admins/moderators click **Go Live** in a room header → choose *Screen + Mic*
  or *Mic only*. Viewers click a join banner; chat stays usable below/beside
  the stream (resizable panels).
- Media goes through **LiveKit** (SFU). Env: `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
  `LIVEKIT_API_SECRET` (local `.env` + Coolify).
- Session state is an in-memory map (`app/utils/live-session.server.ts`),
  announced via Socket.IO (`room.live.started/ended`); token minting and
  start/stop live in `app/routes/resources/live-token.tsx` and
  `live-session.tsx`. Viewers' JWTs are subscribe-only.
- A 45s sweep in `server/server.ts` ends sessions whose broadcaster
  disappeared (~2 min worst case).
- UI components: `app/components/live/` (stage, audio bar, join banner,
  go-live dialog, broadcaster controls).
- Tests: `node scripts/smoke-live.mjs` (HTTP E2E, needs dev server) and
  `node scripts/diag-live.mjs` (two Playwright browsers with fake media +
  server-side LiveKit room inspection).

## Suggested enhancements

### 1. Microphone device picker
Right now the broadcaster's **system default mic** is used (Chrome never asks
which). Add a device selector to `broadcaster-controls.tsx` and the audio bar —
LiveKit ships `useMediaDeviceSelect` / `MediaDeviceMenu` in
`@livekit/components-react`. A small dropdown next to the mic toggle is enough.
Bonus: persist the chosen deviceId in localStorage.

### 2. LiveKit webhook route (production hardening)
The sweep takes ~2 min to clean up after a broadcaster crash. A webhook makes
it instant: add `app/routes/resources/livekit-webhook.tsx` using
`WebhookReceiver` from `livekit-server-sdk` (verify the `Authorization` header
against the API key/secret, read the raw body with `request.text()`). Handle
`room_finished` and `participant_left` (when `identity === broadcasterId`) by
running the same end-session logic as the stop intent. Configure the webhook
URL in the LiveKit Cloud dashboard (prod URL only — Cloud can't reach
localhost, which is why the sweep stays as the dev fallback).

### 3. Theater / fullscreen toggle on the stage
A button on the stage (next to the viewer count) that expands the video:
- *Theater*: stage panel takes ~all of the chat column, chat collapses to a
  narrow side column (YouTube-Live style).
- *Fullscreen*: `videoEl.requestFullscreen()` is the cheap 80% version.

### 4. Broadcaster webcam (optional small tile)
v1 is screen + mic only. Add a camera toggle that publishes
`Track.Source.Camera`, rendered as a small overlay tile in a corner of the
stage (drag-to-reposition optional). LiveKit handles multiple video tracks per
participant fine; the stage already filters by source.

### 5. Raise hand / bring a viewer on mic (v2)
Twitter-Spaces-style: viewer requests, broadcaster approves, server mints that
viewer a fresh token with `canPublish: true` (audio only). Needs: a socket
event for the request, an approval UI for the broadcaster, a token re-fetch +
reconnect on the viewer side, and revoke (re-mint subscribe-only + LiveKit
`updateParticipant` to kill the grant server-side).

### 6. Session persistence across server restarts
Today a server restart clears the in-memory map → app shows "not live" even if
the LiveKit room still has participants. Low priority (broadcaster just clicks
Go Live again). If it ever matters: on boot, `RoomServiceClient.listRooms()` +
`listParticipants()` and rebuild the map for rooms whose broadcaster (an
admin/mod identity) is still connected.

### 7. Live session analytics
Track session history (who went live, duration, peak viewers) — needs a small
Prisma model written on start/stop, peak viewer count sampled by the sweep.
Useful once subscribers pay for live content.

## Known issues / cleanups (unrelated to live)

- **Pre-existing typecheck error** in `app/routes/app/scanner/scanner-index.tsx:58`
  (`targetDate`: `Date` vs `string`). Exists since before the live feature;
  `npm run typecheck` fails on it.
- **Hydration warning** on `/chat/:roomId` page load (React "server HTML didn't
  match client", recovers by client re-render). Seen in Playwright runs; likely
  pre-existing (client-hints/date related), worth a proper diagnosis.
- **Theme cleanup**: `--background`/`--foreground` are not a matched pair —
  `--background` is the dark "shell" color around the cream card in BOTH modes.
  Floating surfaces were fixed by switching Dialog/AlertDialog/Sheet to
  `bg-popover text-popover-foreground` and outline buttons to `bg-transparent`,
  but the underlying naming is still a trap: any new shadcn component using
  `bg-background` will pair wrongly. Proper fix: introduce a dedicated
  `--shell` variable for the app frame, make `--background`/`--foreground` a
  true pair, and sweep usages (`app/app.css` + `app/components/ui/*`,
  `sidebar.tsx:313` SidebarInset is the shell usage to repoint).
- **`tsx watch` on Windows**: killing `npm run dev` can orphan the node child
  holding port 3000. If the server acts stale after a restart, check
  `Get-NetTCPConnection -LocalPort 3000 -State Listen` and kill the owner, and
  delete `node_modules/.vite` if React behaves strangely after dependency
  installs (duplicate-React symptoms: "Invalid hook call", UI disagreeing with
  itself).
