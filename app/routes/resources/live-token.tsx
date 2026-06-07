// app/routes/resources/live-token.tsx
//
// Mints a LiveKit access token for the current user. This is the security
// boundary for live sessions: only the broadcaster's token can publish —
// viewers are locked to subscribe-only inside the JWT itself.

import { type LoaderFunctionArgs, data } from "react-router";
import { AccessToken } from "livekit-server-sdk";
import { requireUserId } from "#/utils/auth.server";
import { prisma } from "#/utils/db.server";
import { liveSessions } from "#/utils/live-session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const roomId = new URL(request.url).searchParams.get("roomId");
  if (!roomId) {
    throw data({ error: "roomId is required" }, { status: 400 });
  }

  const session = liveSessions.get(roomId);
  if (!session) {
    throw data({ error: "No live session in this room" }, { status: 404 });
  }

  if (
    !process.env.LIVEKIT_URL ||
    !process.env.LIVEKIT_API_KEY ||
    !process.env.LIVEKIT_API_SECRET
  ) {
    throw data(
      { error: "Live sessions are not configured on this server." },
      { status: 503 }
    );
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, username: true },
  });
  const isBroadcaster = session.broadcasterId === userId;

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: userId,
      name: user.username ?? user.name ?? "User",
      ttl: "6h",
    }
  );
  at.addGrant({
    room: roomId,
    roomJoin: true,
    canSubscribe: true,
    canPublish: isBroadcaster,
    canPublishData: false,
  });

  // Plain JSON Response: the client requests this with a raw fetch(), not a
  // React Router fetcher, so skip the single-fetch encoding.
  return Response.json({
    token: await at.toJwt(), // async in livekit-server-sdk v2
    url: process.env.LIVEKIT_URL,
    isBroadcaster,
    mode: session.mode,
  });
}
