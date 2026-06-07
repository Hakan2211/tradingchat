// app/components/live/broadcaster-controls.tsx
//
// Floating Meet-style control pill overlaid on the bottom of the stage.
// Only rendered for the broadcaster.

import { useFetcher } from 'react-router';
import { useLocalParticipant } from '@livekit/components-react';
import { Mic, MicOff, MonitorUp, MonitorOff, PhoneOff } from 'lucide-react';
import { Button } from '#/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip';

export function BroadcasterControls({ roomId }: { roomId: string }) {
  const { localParticipant, isMicrophoneEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const fetcher = useFetcher();
  const isEnding = fetcher.state !== 'idle';

  const toggleScreenShare = async () => {
    try {
      // Must run directly in the click handler: getDisplayMedia requires a
      // fresh user gesture.
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled, {
        audio: true, // include tab/system audio when the browser offers it
      });
    } catch {
      // User cancelled the screen picker — not an error.
    }
  };

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
    <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-3 py-2 shadow-lg backdrop-blur-sm">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            onClick={toggleMic}
            aria-label={
              isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'
            }
            className={
              isMicrophoneEnabled
                ? 'rounded-full bg-white/15 text-white hover:bg-white/25'
                : 'rounded-full bg-red-600 text-white hover:bg-red-700'
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

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            onClick={toggleScreenShare}
            aria-label={
              isScreenShareEnabled ? 'Stop sharing screen' : 'Share screen'
            }
            className={
              isScreenShareEnabled
                ? 'rounded-full bg-emerald-600 text-white hover:bg-emerald-700'
                : 'rounded-full bg-white/15 text-white hover:bg-white/25'
            }
          >
            {isScreenShareEnabled ? (
              <MonitorOff className="size-4" />
            ) : (
              <MonitorUp className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isScreenShareEnabled ? 'Stop sharing screen' : 'Share screen'}
        </TooltipContent>
      </Tooltip>

      <div className="h-5 w-px bg-white/20" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            onClick={endSession}
            disabled={isEnding}
            aria-label="End session for everyone"
            className="rounded-full bg-red-600 text-white hover:bg-red-700"
          >
            <PhoneOff className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>End session for everyone</TooltipContent>
      </Tooltip>
    </div>
  );
}
