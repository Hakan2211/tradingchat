// app/components/live/use-live-token.ts
import * as React from "react";
import type { LiveSessionMode } from "./types";

export type LiveConnection = {
  token: string;
  url: string;
  isBroadcaster: boolean;
  mode: LiveSessionMode;
};

/**
 * Fetches a LiveKit access token for the given room from the cookie-authed
 * resource route. The cancelled flag keeps StrictMode's double-mount from
 * setting state from a stale request.
 */
export function useLiveToken(roomId: string) {
  const [connection, setConnection] = React.useState<LiveConnection | null>(
    null
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setConnection(null);
    setError(null);

    fetch(`/resources/live-token?roomId=${encodeURIComponent(roomId)}`)
      .then((res) =>
        res.ok
          ? (res.json() as Promise<LiveConnection>)
          : Promise.reject(new Error(`Token request failed (${res.status})`))
      )
      .then((data) => {
        if (!cancelled) setConnection(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not join the live session.");
      });

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  return { connection, error };
}
