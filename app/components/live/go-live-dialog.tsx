// app/components/live/go-live-dialog.tsx
import * as React from 'react';
import { useFetcher } from 'react-router';
import { Loader2, Mic, MonitorUp, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip';
import type { LiveSessionMode } from './types';

export function GoLiveDialog({ roomId }: { roomId: string }) {
  const [open, setOpen] = React.useState(false);
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const isSubmitting = fetcher.state !== 'idle';
  // Which tile was clicked, so only that one shows the spinner.
  const submittingMode = fetcher.formData?.get('mode');

  React.useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.error) {
        toast.error(fetcher.data.error);
      } else if (fetcher.data.ok) {
        setOpen(false);
      }
    }
  }, [fetcher.state, fetcher.data]);

  const start = (mode: LiveSessionMode) => {
    fetcher.submit(
      { intent: 'start', roomId, mode },
      { method: 'POST', action: '/resources/live-session' }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700"
            >
              <Radio className="size-4" />
              <span className="sr-only">Go live</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Go live in this room</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-red-600" />
            </span>
            Go live in this room
          </DialogTitle>
          <DialogDescription>
            Everyone in this room can watch and listen. Pick how you want to
            broadcast:
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <LiveModeTile
            icon={
              submittingMode === 'screen' ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <MonitorUp className="size-6" />
              )
            }
            title="Screen + Mic"
            description="Share your screen and talk"
            disabled={isSubmitting}
            onClick={() => start('screen')}
          />
          <LiveModeTile
            icon={
              submittingMode === 'audio' ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <Mic className="size-6" />
              )
            }
            title="Mic only"
            description="Voice session, no screen"
            disabled={isSubmitting}
            onClick={() => start('audio')}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          You can mute or stop sharing at any time.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function LiveModeTile({
  icon,
  title,
  description,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group flex flex-col items-center gap-2.5 rounded-xl border border-border bg-muted/40 p-5 text-center transition-all hover:border-red-500/60 hover:bg-red-600/10 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-red-600/10 text-red-500 transition-colors group-hover:bg-red-600 group-hover:text-white">
        {icon}
      </span>
      <span className="font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}
