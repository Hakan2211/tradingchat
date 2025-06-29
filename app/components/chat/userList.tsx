// app/components/chat/user-list.tsx
import { Link } from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { ScrollArea } from '#/components/ui/scroll-area';
import { Badge } from '#/components/ui/badge';
import { getUserImagePath } from '#/utils/misc';
import { useMemo } from 'react';
import { PresenceIndicator } from './presenceIndicator';

type User = {
  id: string;
  name: string | null;
  username: string | null;
  image: { id: string } | null;
  roles: { name: string }[];
};

export function UserList({
  members,
  currentUserId,
  onlineUserIds,
}: {
  members: User[];
  currentUserId?: string;
  onlineUserIds: Set<string>;
}) {
  const groupedUsers = useMemo(() => {
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

    // Function to sort a group by online status then by name
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

  const UserListItem = ({ user }: { user: User }) => {
    const isCurrentUser = user.id === currentUserId;
    const isOnline = onlineUserIds.has(user.id);
    return (
      <Link
        to={`/user/${user.id}`}
        className={`flex items-center gap-3 rounded-md p-2 hover:bg-muted/50 ${
          isCurrentUser ? 'bg-muted/30' : ''
        }`}
      >
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
          <PresenceIndicator isOnline={isOnline} />
        </div>
        <div className="flex-1 truncate">
          <div className="flex items-center gap-1">
            <p className="font-semibold text-sm truncate">{user.name}</p>
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs">
                You
              </Badge>
            )}
          </div>
          {user.username && (
            <p className="text-xs text-muted-foreground truncate">
              @{user.username}
            </p>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col mt-5">
      {/* <header className="flex-none border-b p-4">
        <h2 className="text-md">Members — {members.length}</h2>
      </header> */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {/* Render Admins */}
          {groupedUsers.admins.length > 0 && (
            <div className="mb-4">
              <h3 className="px-2 text-xs font-semibold uppercase text-muted-foreground">
                Admins
              </h3>
              {groupedUsers.admins.map((user) => (
                <UserListItem key={user.id} user={user} />
              ))}
            </div>
          )}

          {/* Render Moderators */}
          {groupedUsers.moderators.length > 0 && (
            <div className="mb-4">
              <h3 className="px-2 text-xs font-semibold uppercase text-muted-foreground">
                Moderators
              </h3>
              {groupedUsers.moderators.map((user) => (
                <UserListItem key={user.id} user={user} />
              ))}
            </div>
          )}

          {/* Render Online Users */}
          {groupedUsers.online.length > 0 && (
            <div>
              <h3 className="px-2 text-xs font-semibold uppercase text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span>Online</span>
                  <span className="text-xs text-muted-foreground">—</span>
                  <span className="text-xs text-muted-foreground">
                    {groupedUsers.online.length}
                  </span>
                </div>
              </h3>
              {groupedUsers.online.map((user) => (
                <UserListItem key={user.id} user={user} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
