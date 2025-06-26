// app/components/chat/chat-message.tsx

import { format } from 'date-fns';
import { cn } from '#/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { getUserImagePath } from '#/utils/misc';
import { MessageActions } from './message-actions';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover';
import { EllipsisVertical } from 'lucide-react';

type ChatMessageProps = {
  message: {
    id: string;
    content: string;
    createdAt: Date;
    user: {
      id: string;
      name: string | null;
      image: { id: string } | null;
    };
  };
  isCurrentUser: boolean;
};

export function ChatMessage({ message, isCurrentUser }: ChatMessageProps) {
  const userInitial = message.user.name
    ? message.user.name.charAt(0).toUpperCase()
    : '?';

  return (
    <div className="flex items-start gap-3">
      <Avatar className="size-8 shrink-0 aspect-square rounded-lg bg-emerald-700 text-primary-foreground">
        <AvatarImage
          src={
            message.user.image?.id
              ? getUserImagePath(message.user.image.id)
              : undefined
          }
        />
        <AvatarFallback className="rounded-lg aspect-square bg-emerald-700 text-primary-foreground">
          {userInitial}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col items-start">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm">{message.user.name}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(message.createdAt), 'p')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={cn(
              'max-w-md rounded-xl px-3 py-2 mt-1',
              isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </p>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              {/* FIX #1: Removed opacity classes to make the icon always visible.
                  Added a muted text color for a softer, less distracting look. */}
              <button className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/80 transition-colors hover:bg-accent hover:text-foreground">
                <EllipsisVertical size={16} />
                <span className="sr-only">Message options</span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              // FIX #2: Changed side from "top" to "bottom"
              side="bottom"
              align="start"
              className="border-none bg-transparent p-0 shadow-none"
            >
              <MessageActions />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
