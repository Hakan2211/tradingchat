// app/components/chat/user-list.tsx
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { ScrollArea } from '#/components/ui/scroll-area';
import { Badge } from '#/components/ui/badge';
import { getUserImagePath } from '#/utils/misc';
import React from 'react';
import { PresenceIndicator } from './presenceIndicator';
import { type UserStatus } from '@prisma/client';
import { cn } from '#/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '#/components/ui/dropdown-menu';
import { MessageSquare, Circle, User as UserIcon } from 'lucide-react';
import { Link, useFetcher } from 'react-router';

type User = {
  id: string;
  name: string | null;
  username: string | null;
  image: { id: string } | null;
  roles: { name: string }[];
  status: UserStatus;
};

const UserListItem = React.memo(function UserListItem({
  user,
  isCurrentUser,
  isOnline,
  status,
}: {
  user: User;
  isCurrentUser: boolean;
  isOnline: boolean;
  status: UserStatus;
}) {
  const statusFetcher = useFetcher();
  const createDmFetcher = useFetcher();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* This is the same button UI as before */}
        <button className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-muted/50">
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={user.image ? getUserImagePath(user.image.id) : undefined}
                alt={user.name ?? ''}
              />
              <AvatarFallback>
                {user.name?.[0]?.toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <PresenceIndicator isOnline={isOnline} status={status} />
          </div>
          <div className="flex-1 truncate">
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  'font-semibold text-sm truncate',
                  !isOnline && 'text-muted-foreground/70'
                )}
              >
                {user.name}
              </p>
              {isCurrentUser && (
                <Badge variant="outline" className="text-xs">
                  You
                </Badge>
              )}
            </div>
            {user.username && (
              <p
                className={cn(
                  'text-xs truncate',
                  isOnline
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/60'
                )}
              >
                @{user.username}
              </p>
            )}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" side="left" align="start">
        {/* User Info Header */}
        <DropdownMenuLabel className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.image ? getUserImagePath(user.image.id) : undefined}
            />
            <AvatarFallback>
              {user.name?.[0]?.toUpperCase() ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="truncate">
            <p className="font-semibold truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              @{user.username}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Action Items */}
        {isCurrentUser ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Circle className="mr-2 h-4 w-4" />
              <span>Set Status</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onSelect={() =>
                  statusFetcher.submit(
                    { status: 'ONLINE' },
                    { method: 'POST', action: '/resources/user-status' }
                  )
                }
              >
                <Circle className="mr-2 h-4 w-4 text-green-600 fill-green-600" />
                Online
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  statusFetcher.submit(
                    { status: 'AWAY' },
                    { method: 'POST', action: '/resources/user-status' }
                  )
                }
              >
                <Circle className="mr-2 h-4 w-4 text-yellow-600 fill-yellow-600" />
                Away
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  statusFetcher.submit(
                    { status: 'DO_NOT_DISTURB' },
                    { method: 'POST', action: '/resources/user-status' }
                  )
                }
              >
                <Circle className="mr-2 h-4 w-4 text-red-600 fill-red-600" />
                Do Not Disturb
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <DropdownMenuItem
            onSelect={() =>
              createDmFetcher.submit(
                { targetUserId: user.id },
                { method: 'POST', action: '/resources/create-dm' }
              )
            }
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Message</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild>
          <Link to={`/user/${user.id}`}>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export function UserList({
  members,
  currentUserId,
  onlineUserIds,
  userStatuses,
}: {
  members: User[];
  currentUserId?: string;
  onlineUserIds: Set<string>;
  userStatuses: Map<string, UserStatus>;
}) {
  const groupedUsers = React.useMemo(() => {
    // ... your grouping logic is perfect ...
    const admins: User[] = [];
    const moderators: User[] = [];
    const online: User[] = [];

    members.forEach((member) => {
      if (member.roles.some((role) => role.name === 'admin'))
        admins.push(member);
      else if (member.roles.some((role) => role.name === 'moderator'))
        moderators.push(member);
      else online.push(member);
    });

    const sortGroup = (group: User[]) => {
      return group.sort((a, b) => {
        const aIsOnline = onlineUserIds.has(a.id);
        const bIsOnline = onlineUserIds.has(b.id);
        if (aIsOnline && !bIsOnline) return -1;
        if (!aIsOnline && bIsOnline) return 1;
        return (a.name ?? '').localeCompare(b.name ?? '');
      });
    };

    return {
      admins: sortGroup(admins),
      moderators: sortGroup(moderators),
      online: sortGroup(online),
    };
  }, [members, onlineUserIds]);

  // Calculate online count considering only socket connection
  const onlineCount = members.filter((member) =>
    onlineUserIds.has(member.id)
  ).length;

  return (
    <div className="flex h-full flex-col">
      <header className="flex-none border-b p-4">
        <h2 className="text-md font-semibold">
          Members — {onlineCount} Online
        </h2>
      </header>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {groupedUsers.admins.length > 0 && (
            <div className="mb-4">
              <h3 className="px-2 text-xs font-semibold uppercase text-muted-foreground">
                Admins
              </h3>
              {groupedUsers.admins.map((user) => (
                <UserListItem
                  key={user.id}
                  user={user}
                  isCurrentUser={user.id === currentUserId}
                  isOnline={onlineUserIds.has(user.id)}
                  status={userStatuses.get(user.id) ?? user.status}
                />
              ))}
            </div>
          )}
          {groupedUsers.moderators.length > 0 && (
            <div className="mb-4">
              <h3 className="px-2 text-xs font-semibold uppercase text-muted-foreground">
                Moderators
              </h3>
              {groupedUsers.moderators.map((user) => (
                <UserListItem
                  key={user.id}
                  user={user}
                  isCurrentUser={user.id === currentUserId}
                  isOnline={onlineUserIds.has(user.id)}
                  status={userStatuses.get(user.id) ?? user.status}
                />
              ))}
            </div>
          )}
          {groupedUsers.online.length > 0 && (
            <div>
              <h3 className="px-2 text-xs font-semibold uppercase text-muted-foreground">
                Online
              </h3>
              {groupedUsers.online.map((user) => (
                <UserListItem
                  key={user.id}
                  user={user}
                  isCurrentUser={user.id === currentUserId}
                  isOnline={onlineUserIds.has(user.id)}
                  status={userStatuses.get(user.id) ?? user.status}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
