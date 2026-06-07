// app/routes/resources/live-session.tsx
//
// Start/stop a live broadcast in a chat room. Authorization happens here via
// the cookie session - never via Socket.IO identity (which is unvalidated).
// Socket.IO is only used to notify clients that a session started/ended.
//
// Expected errors are RETURNED (not thrown) so the submitting fetcher can
// toast them instead of bubbling to the route error boundary. Note: this is a
// resource route, so plain Response.json is used (returned `data()` would
// lose its HTTP status here).

import { type ActionFunctionArgs } from "react-router";
import type { Server } from "socket.io";
import { RoomServiceClient } from "livekit-server-sdk";
import { requireUserId } from "#/utils/auth.server";
import { prisma } from "#/utils/db.server";
import { liveSessions, publicSession } from "#/utils/live-session.server";

function getRoomService() {
  const url = process.env.LIVEKIT_URL;
  if (!url || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    return null;
  }
  // RoomServiceClient talks HTTP(S); LIVEKIT_URL is the ws(s):// client URL.
  return new RoomServiceClient(
    url.replace(/^ws/, "http"),
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET
  );
}

export async function action({ request, context }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const roomId = formData.get("roomId");
  if (typeof roomId !== "string" || !roomId) {
    return Response.json({ error: "roomId is required" }, { status: 400 });
  }
  const { io } = context as { io: Server };

  const roomService = getRoomService();
  if (!roomService) {
    return Response.json(
      { error: "Live sessions are not configured on this server." },
      { status: 503 }
    );
  }

  if (intent === "start") {
    // Only admins and moderators may broadcast (same gate as the scanner).
    const host = await prisma.user.findFirst({
      select: { id: true, name: true, username: true },
      where: {
        id: userId,
        roles: { some: { name: { in: ["admin", "moderator"] } } },
      },
    });
    if (!host) {
      return Response.json(
        { error: "You must be an admin or moderator to go live." },
        { status: 403 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { name: true },
    });
    if (!room || room.name.startsWith("dm:")) {
      return Response.json({ error: "Invalid room" }, { status: 400 });
    }
    if (liveSessions.has(roomId)) {
      return Response.json(
        { error: "A live session is already running in this room." },
        { status: 409 }
      );
    }

    const mode = formData.get("mode") === "audio" ? "audio" : "screen";

    try {
      await roomService.createRoom({
        name: roomId,
        emptyTimeout: 300,
        departureTimeout: 60,
        maxParticipants: 200,
      });
    } catch (error) {
      console.error("LiveKit createRoom failed:", error);
      return Response.json(
        { error: "Could not reach the live media server. Try again." },
        { status: 502 }
      );
    }

    const session = {
      roomId,
      broadcasterId: userId,
      broadcasterName: host.username ?? host.name ?? "Host",
      mode,
      startedAt: Date.now(),
      missedSweeps: 0,
    } as const;
    liveSessions.set(roomId, { ...session });
    io.emit("room.live.started", publicSession({ ...session }));
    return Response.json({ ok: true });
  }

  if (intent === "stop") {
    const session = liveSessions.get(roomId);
    if (!session) return Response.json({ ok: true }); // already ended - idempotent

    if (session.broadcasterId !== userId) {
      // Any admin may force-end a stuck session they don't own.
      const admin = await prisma.user.findFirst({
        select: { id: true },
        where: { id: userId, roles: { some: { name: "admin" } } },
      });
      if (!admin) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    liveSessions.delete(roomId);
    // Disconnects all LiveKit participants; ignore "room not found".
    await roomService.deleteRoom(roomId).catch(() => {});
    io.emit("room.live.ended", { roomId });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown intent" }, { status: 400 });
}
