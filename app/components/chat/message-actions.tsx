import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '#/components/ui/tooltip';
import { cn } from '#/lib/utils';
import { Bookmark, ThumbsUp, CornerUpLeft, Pencil, Trash } from 'lucide-react';

function ActionButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="relative flex h-8 w-8 items-center justify-center text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring/70">
          {icon}
          <span className="sr-only">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="px-2 py-1 text-xs">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function MessageActions({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex -space-x-px rounded-md border bg-background shadow-sm',
        className
      )}
    >
      <TooltipProvider delayDuration={0}>
        <ActionButton icon={<CornerUpLeft size={16} />} label="Reply" />
        <ActionButton icon={<Bookmark size={16} />} label="Bookmark" />
        <ActionButton icon={<ThumbsUp size={16} />} label="Like" />
        <ActionButton icon={<Pencil size={16} />} label="Edit" />
        <ActionButton icon={<Trash size={16} />} label="Delete" />
      </TooltipProvider>
    </div>
  );
}
