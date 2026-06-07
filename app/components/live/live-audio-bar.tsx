// app/components/live/live-audio-bar.tsx
//
// Slim bar rendered instead of the video stage for mic-only sessions
// (mode === 'audio'). Viewers get audio + a leave button; the broadcaster
// gets mic mute + end session.
//
// NOTE: LiveKitRoom's container ships CSS with `height: 100%` and a theme
// background — left alone it swallows the whole chat column. The inline
// style override keeps it collapsed to bar height.

import * as React from 'react';
import { useFetcher } from 'react-router';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useLocalParticipant,
  useParticipants,
  useSpeakingParticipants,
} from '@livekit/components-react';
import { Headphones, LogOut, Mic, MicOff, PhoneOff, Radio } from 'lucide-react';
import { Button } from '#/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip';
import { useLiveToken } from './use-live-token';

function BarShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-red-600/20 bg-red-600/5 px-4 py-2.5 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function LiveAudioBar({
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
    return <BarShell>{error}</BarShell>;
  }
  if (!connection) {
    return (
      <BarShell>
        <Radio className="size-4 animate-pulse text-red-500" />
        Connecting to live audio…
      </BarShell>
    );
  }

  return (
    <LiveKitRoom
      token={connection.token}
      serverUrl={connection.url}
      connect
      audio={connection.isBroadcaster}
      video={false}
      screen={false}
      connectOptions={{ autoSubscribe: true }}
      onDisconnected={onLeave}
      className="flex-shrink-0"
      style={{ height: 'auto', background: 'transparent' }}
    >
      <AudioBarContent
        roomId={roomId}
        broadcasterName={broadcasterName}
        isBroadcaster={connection.isBroadcaster}
        onLeave={onLeave}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function AudioBarContent({
  roomId,
  broadcasterName,
  isBroadcaster,
  onLeave,
}: {
  roomId: string;
  broadcasterName: string;
  isBroadcaster: boolean;
  onLeave: () => void;
}) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const listenerCount = Math.max(0, useParticipants().length - 1);
  const isSpeaking = useSpeakingParticipants().length > 0;
  const fetcher = useFetcher();
  const isEnding = fetcher.state !== 'idle';

  const toggleMic = async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch {
      // Mic permission denied; the browser already surfaced it.
    }
  };

  const endSession = () => {
    fetcher.submit(
      { intent: 'stop', roomId },
      { method: 'POST', action: '/resources/live-session' }
    );
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b border-red-600/20 bg-red-600/5 px-4 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {/* Pulsing live dot, glows brighter while someone is speaking */}
        <span className="relative flex size-2.5 flex-shrink-0">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 ${
              isSpeaking ? 'opacity-90' : 'opacity-40'
            }`}
          />
          <span className="relative inline-flex size-2.5 rounded-full bg-red-600" />
        </span>

        <p className="truncate text-sm">
          <span className="font-semibold">{broadcasterName}</span>{' '}
          <span className="text-muted-foreground">is live on audio</span>
        </p>

        <span className="hidden flex-shrink-0 items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground sm:flex">
          <Headphones className="size-3" />
          {listenerCount} listening
        </span>

        <StartAudio
          label="Enable audio"
          className="flex-shrink-0 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-medium text-white hover:bg-red-700"
        />
      </div>

      <div className="flex flex-shrink-0 items-center gap-1.5">
        {isBroadcaster ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMic}
                  className={
                    isMicrophoneEnabled
                      ? 'text-foreground'
                      : 'bg-red-600/15 text-red-600 hover:bg-red-600/25 hover:text-red-600'
                  }
                >
                  {isMicrophoneEnabled ? (
                    <Mic className="size-4" />
                  ) : (
                    <MicOff className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
              </TooltipContent>
            </Tooltip>
            <Button
              size="sm"
              onClick={endSession}
              disabled={isEnding}
              className="gap-1.5 bg-red-600 text-white hover:bg-red-700"
            >
              <PhoneOff className="size-3.5" />
              End
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLeave}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-3.5" />
            Leave
          </Button>
        )}
      </div>
    </div>
  );
}
