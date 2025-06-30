import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Circle, UserIcon, MessageSquare } from 'lucide-react';
import { getUserImagePath } from '#/utils/misc';
import { useFetcher, Link, Form } from 'react-router';
import { type UserStatus } from '@prisma/client';

type User = {
  id: string;
  name: string | null;
  username: string | null;
  image: { id: string } | null;
  roles: { name: string }[];
  status: UserStatus;
};

export function UserPopoverContent({
  user,
  isCurrentUser,
  closePopover,
}: {
  user: User;
  isCurrentUser: boolean;
  closePopover: () => void;
}) {
  const statusFetcher = useFetcher();
  const createDmFetcher = useFetcher();
  const handleStatusClick = (event: React.MouseEvent, status: UserStatus) => {
    event.preventDefault();
    statusFetcher.submit(
      { status },
      { method: 'POST', action: '/resources/user-status' }
    );
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14">
          <AvatarImage
            src={user.image ? getUserImagePath(user.image.id) : undefined}
          />
          <AvatarFallback>
            {user.name?.[0]?.toUpperCase() ?? 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="truncate">
          <p className="font-bold text-lg truncate">{user.name}</p>
          <p className="text-sm text-muted-foreground truncate">
            @{user.username}
          </p>
        </div>
      </div>

      {isCurrentUser && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">
            SET STATUS
          </h4>
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              className="justify-start gap-2"
              onClick={(e) => handleStatusClick(e, 'ONLINE')}
            >
              <Circle className="h-4 w-4 text-green-600 fill-green-600" />{' '}
              Online
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2"
              onClick={(e) => handleStatusClick(e, 'AWAY')}
            >
              <Circle className="h-4 w-4 text-yellow-600 fill-yellow-600" />{' '}
              Away
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2"
              onClick={(e) => handleStatusClick(e, 'DO_NOT_DISTURB')}
            >
              <Circle className="h-4 w-4 text-red-600 fill-red-600" /> Do Not
              Disturb
            </Button>
          </div>
        </div>
      )}

      <div className="flex w-full gap-2 pt-2 border-t">
        <Button asChild variant="secondary" className="flex-1">
          <Link to={`/user/${user.id}`}>
            <UserIcon className="mr-2 h-4 w-4" /> Profile
          </Link>
        </Button>
        {!isCurrentUser && (
          <createDmFetcher.Form
            method="POST"
            action="/resources/create-dm"
            className="flex-1"
            onSubmit={() => {
              if (closePopover) {
                closePopover();
              }
            }}
          >
            <input type="hidden" name="targetUserId" value={user.id} />
            <Button type="submit" className="w-full">
              <MessageSquare className="mr-2 h-4 w-4" />
              Message
            </Button>
          </createDmFetcher.Form>
        )}
      </div>
    </div>
  );
}
