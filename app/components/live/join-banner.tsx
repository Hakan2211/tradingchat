// app/components/live/join-banner.tsx
import { Button } from "#/components/ui/button";
import type { PublicLiveSession } from "./types";

export function JoinBanner({
  session,
  onJoin,
}: {
  session: PublicLiveSession;
  onJoin: () => void;
}) {
  return (
    <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-red-600/10 px-4 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="relative flex size-2.5 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-red-600" />
        </span>
        <p className="truncate text-sm">
          <span className="font-semibold">{session.broadcasterName}</span> is
          live{session.mode === "audio" ? " (audio only)" : ""}
        </p>
      </div>
      <Button
        size="sm"
        onClick={onJoin}
        className="flex-shrink-0 bg-red-600 text-white hover:bg-red-700"
      >
        {session.mode === "audio" ? "Listen in" : "Watch"}
      </Button>
    </div>
  );
}
