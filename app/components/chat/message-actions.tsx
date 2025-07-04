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
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="relative flex h-8 w-8 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-sidebar-accent focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring/70"
        >
          {icon}
          <span className="sr-only">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="px-2 py-1 text-xs text-sidebar-accent-foreground"
      >
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function MessageActions({
  className,
  onReply,
  onDelete,
  canDelete,
  canEdit,
  onEdit,
  isBookmarked,
  onBookmarkToggle,
}: {
  className?: string;
  onReply?: () => void;
  onDelete?: () => void;
  canDelete: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
  isBookmarked?: boolean;
  onBookmarkToggle?: () => void;
}) {
  return (
    <div
      className={cn(
        'inline-flex -space-x-px rounded-md border bg-background shadow-sm',
        className
      )}
    >
      <TooltipProvider delayDuration={0}>
        <ActionButton
          icon={<CornerUpLeft size={16} />}
          label="Reply"
          onClick={onReply}
        />
        <ActionButton
          icon={
            <Bookmark
              size={16}
              className={cn(isBookmarked && 'fill-current text-yellow-500')}
            />
          }
          label={isBookmarked ? 'Remove Bookmark' : 'Bookmark'}
          onClick={onBookmarkToggle}
        />
        {/* <ActionButton icon={<ThumbsUp size={16} />} label="Like" /> */}
        {canEdit && (
          <ActionButton
            icon={<Pencil size={16} />}
            label="Edit"
            onClick={onEdit}
          />
        )}

        {canDelete && (
          <ActionButton
            icon={<Trash size={16} />}
            label="Delete"
            onClick={onDelete}
          />
        )}
      </TooltipProvider>
    </div>
  );
}
