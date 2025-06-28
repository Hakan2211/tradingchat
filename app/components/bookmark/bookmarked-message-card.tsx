// app/components/chat/bookmarked-message-card.tsx

import { format } from 'date-fns';
import { Link, useFetcher } from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { getUserImagePath, getChatImagePath } from '#/utils/misc';
import { BookmarkIcon, CornerDownRight, ImageIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '#/components/ui/card';
import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog';

type BookmarkedMessageCardProps = {
  bookmark: {
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
  const { message } = bookmark;
  const userInitial = message.user?.name
    ? message.user.name.charAt(0).toUpperCase()
    : '?';

  const bookmarkFetcher = useFetcher();

  if (
    bookmarkFetcher.data &&
    bookmarkFetcher.data.toggledMessageId === message.id
  ) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 p-4">
        <Avatar className="size-9 shrink-0">
          <AvatarImage
            src={
              message.user?.image?.id
                ? getUserImagePath(message.user.image.id)
                : undefined
            }
          />
          <AvatarFallback>{userInitial}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">{message.user?.name}</p>
          <p className="text-sm text-muted-foreground">
            Bookmarked on {format(new Date(bookmark.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {message.content && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed mb-3">
            {message.content}
          </p>
        )}

        {message.image?.id && (
          <Dialog>
            <DialogTitle className="sr-only">
              {message.image.altText ?? 'Bookmarked image'}
            </DialogTitle>
            <DialogTrigger asChild>
              <img
                src={getChatImagePath(message.image.id)}
                alt={message.image.altText ?? 'Bookmarked image'}
                className="max-w-xs cursor-pointer rounded-lg object-cover transition hover:opacity-90"
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
        )}

        {!message.content && message.image && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <ImageIcon className="size-4" />
            <span>Image</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-3">
        <Link
          to={`/chat/${message.roomId}`}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <CornerDownRight size={16} />
          <span>View in chat</span>
        </Link>
        <bookmarkFetcher.Form method="post" action="/chat/any">
          {/* We point the action to a valid chat route because that's where the action lives.
              The roomId ('any') doesn't matter since the action doesn't use it. */}
          <input type="hidden" name="intent" value="toggleBookmark" />
          <input type="hidden" name="messageId" value={message.id} />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="size-8 text-yellow-500 hover:text-yellow-600"
            aria-label="Remove bookmark"
          >
            <BookmarkIcon className="fill-current" size={16} />
          </Button>
        </bookmarkFetcher.Form>
      </CardFooter>
    </Card>
  );
}
