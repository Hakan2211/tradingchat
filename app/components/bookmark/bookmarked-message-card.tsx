// app/components/chat/bookmarked-message-card.tsx

import { format } from 'date-fns';
import { Link, useFetcher } from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { getUserImagePath } from '#/utils/misc';
import { BookmarkIcon, CornerDownRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '#/components/ui/card';
import { Button } from '#/components/ui/button';

type BookmarkedMessageCardProps = {
  bookmark: {
    createdAt: Date;
    message: {
      id: string;
      content: string;
      roomId: string;
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
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>
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
