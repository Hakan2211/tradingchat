// app/components/live/live-stage.tsx
//
// The screen-share stage rendered inside the chat room when a session with
// mode === 'screen' is live. Connects to LiveKit with a token from the
// cookie-authed resource route; only the broadcaster's token can publish.

import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  VideoTrack,
  useTracks,
  useParticipants,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import { Eye, MonitorUp } from 'lucide-react';
import { BroadcasterControls } from './broadcaster-controls';
import { useLiveToken } from './use-live-token';

export function LiveStage({
  roomId,
  broadcasterName,
  onLeave,
}: {
  roomId: string;
  broadcasterName: string;
  onLeave: () => void;
}) {
  const { connection, error } = useLiveToken(roomId);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-black text-sm text-white/70">
        {error}
      </div>
    );
  }
  if (!connection) {
    return (
      <div className="flex h-full items-center justify-center bg-black text-sm text-white/70">
        Connecting…
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={connection.token}
      serverUrl={connection.url}
      connect
      // The broadcaster publishes their mic on connect; screen share starts
      // via the explicit button (getDisplayMedia needs its own user gesture).
      audio={connection.isBroadcaster}
      video={false}
      screen={false}
      connectOptions={{ autoSubscribe: true }}
      onDisconnected={onLeave}
      className="flex h-full flex-col"
      // Inline: LiveKit's .lk-room-container CSS overrides Tailwind classes.
      style={{ height: '100%', background: 'black' }}
    >
      <div className="relative min-h-0 flex-1">
        <ScreenShareView broadcasterName={broadcasterName} />

        {/* LIVE chip — top left */}
        <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-red-600" />
          </span>
          LIVE
          <span className="font-normal text-white/70">· {broadcasterName}</span>
        </div>

        <ViewerCountBadge />

        <StartAudio
          label="Click to enable audio"
          className="absolute inset-x-0 top-12 z-10 mx-auto w-fit rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
        />

        {connection.isBroadcaster && <BroadcasterControls roomId={roomId} />}
      </div>
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function ScreenShareView({ broadcasterName }: { broadcasterName: string }) {
  // Include unsubscribed refs so the broadcaster's own (local) track shows,
  // but only render a video once it actually has media — rendering an
  // unsubscribed publication paints a black void.
  const tracks = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: false,
  });
  const activeTrack = tracks.find(
    (t) => t.participant.isLocal || t.publication?.isSubscribed
  );

  if (!activeTrack) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-white/60">
        <span className="flex size-14 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
          <MonitorUp className="size-6 animate-pulse" />
        </span>
        <p className="text-sm">
          Waiting for {broadcasterName} to share their screen…
        </p>
      </div>
    );
  }

  return (
    <VideoTrack
      trackRef={activeTrack}
      className="h-full w-full object-contain"
    />
  );
}

function ViewerCountBadge() {
  // Total participants minus the broadcaster — consistent for everyone.
  const count = Math.max(0, useParticipants().length - 1);
  return (
    <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
      <Eye className="size-3" />
      {count} watching
    </div>
  );
}
