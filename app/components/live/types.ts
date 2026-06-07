// Client-safe types for live sessions. Keep this file free of server-only
// imports — it is shared between components and the SocketProvider.

export type LiveSessionMode = "screen" | "audio";

export type PublicLiveSession = {
  roomId: string;
  broadcasterId: string;
  broadcasterName: string;
  mode: LiveSessionMode;
  startedAt: number;
};
