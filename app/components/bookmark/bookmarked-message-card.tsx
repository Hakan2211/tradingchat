import { Link, useFetcher } from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { Button } from '#/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '#/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog';
import { getUserImagePath, getChatImagePath } from '#/utils/misc';
import { BookmarkIcon, Calendar } from 'lucide-react';
import { isToday, isYesterday } from 'date-fns';
import { HydratedDate } from '../chat/dateBadge';

type BookmarkedMessageCardProps = {
  bookmark: {
    id: string;
    createdAt: Date;
    message: {
      id: string;
      content: string | null;
      roomId: string;
      image: {
        id: string;
        altText: string | null;
      } | null;
      user: {
        id: string;
        name: string | null;
        image: { id: string } | null;
      } | null;
    };
  };
};

export function BookmarkedMessageCard({
  bookmark,
}: BookmarkedMessageCardProps) {
  const bookmarkFetcher = useFetcher();
  const { message } = bookmark;

  const userInitial = message.user?.name
    ? message.user.name.charAt(0).toUpperCase()
    : '?';

  if (
    bookmarkFetcher.data &&
    bookmarkFetcher.data.toggledMessageId === message.id
  ) {
    return null;
  }

  return (
    <div className="group flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors">
      {/* User Avatar */}
      <Avatar className="size-8 shrink-0">
        <AvatarImage
          src={
            message.user?.image?.id
              ? getUserImagePath(message.user.image.id)
              : undefined
          }
        />
        <AvatarFallback className="text-xs">{userInitial}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-sm truncate">{message.user?.name}</p>
          <HydratedDate
            date={new Date(bookmark.createdAt)}
            formatStr="HH:mm"
            className="text-xs text-muted-foreground"
            fallback="--:--"
          />
        </div>

        {message.content && (
          <p className="text-sm text-muted-foreground mb-2">
            {message.content}
          </p>
        )}

        {message.image && (
          <div className="mb-2">
            <Dialog>
              <DialogTitle className="sr-only">
                {message.image.altText ?? 'Bookmarked image'}
              </DialogTitle>
              <DialogTrigger asChild>
                <img
                  src={getChatImagePath(message.image.id)}
                  alt={message.image.altText ?? 'Bookmarked image'}
                  className="w-48 h-32 rounded-md object-cover border cursor-pointer hover:opacity-90 transition-opacity"
                />
              </DialogTrigger>
              <DialogContent className="p-0 border-0 max-w-4xl max-h-[90vh]">
                <img
                  src={getChatImagePath(message.image.id)}
                  alt={message.image.altText ?? 'Bookmarked image'}
                  className="w-full h-full object-contain rounded-lg"
                />
              </DialogContent>
              <DialogDescription className="sr-only">
                {message.image.altText ?? 'Bookmarked image'}
              </DialogDescription>
            </Dialog>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <bookmarkFetcher.Form method="post" action="/chat/any">
              <input type="hidden" name="intent" value="toggleBookmark" />
              <input type="hidden" name="messageId" value={message.id} />
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-yellow-500 hover:text-yellow-600 cursor-pointer"
                >
                  <BookmarkIcon className="fill-current size-4" />
                </Button>
              </TooltipTrigger>
            </bookmarkFetcher.Form>
            <TooltipContent>
              <p>Remove bookmark</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// Date header component for grouping bookmarks by date
export function BookmarkDateHeader({ date }: { date: string }) {
  const dateObj = new Date(date);

  let displayContent: React.ReactNode;
  if (isToday(dateObj)) {
    displayContent = 'Today';
  } else if (isYesterday(dateObj)) {
    displayContent = 'Yesterday';
  } else {
    displayContent = (
      <HydratedDate date={dateObj} formatStr="MMMM d, yyyy" fallback="..." />
    );
  }

  return (
    <div className="relative text-center my-8">
      <hr className="absolute left-0 top-1/2 w-full -translate-y-1/2 border-border/50" />
      <span className="relative z-10 inline-flex items-center gap-2 rounded-full bg-card px-3 border border-border/50 py-1 text-xs font-medium text-muted-foreground/80">
        <Calendar className="size-4" />
        {displayContent}
      </span>
    </div>
  );
}
