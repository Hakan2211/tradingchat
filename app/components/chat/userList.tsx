// app/components/chat/user-list.tsx
import { Link } from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { ScrollArea } from '#/components/ui/scroll-area';
import { Badge } from '#/components/ui/badge';
import { getUserImagePath } from '#/utils/misc';
import { useMemo } from 'react';

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
}: {
  members: User[];
  currentUserId?: string;
}) {
  const groupedUsers = useMemo(() => {
    const admins: User[] = [];
    const moderators: User[] = [];
    const onlineUsers: User[] = []; // Renamed from 'users' to be clearer

    members.forEach((member) => {
      if (member.roles.some((role) => role.name === 'admin')) {
        admins.push(member);
      } else if (member.roles.some((role) => role.name === 'moderator')) {
        moderators.push(member);
      } else {
        onlineUsers.push(member);
      }
    });

    return { admins, moderators, onlineUsers };
  }, [members]);

  const UserListItem = ({ user }: { user: User }) => {
    const isCurrentUser = user.id === currentUserId;
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
          {groupedUsers.onlineUsers.length > 0 && (
            <div>
              <h3 className="px-2 text-xs font-semibold uppercase text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span>Online</span>
                  <span className="text-xs text-muted-foreground">—</span>
                  <span className="text-xs text-muted-foreground">
                    {groupedUsers.onlineUsers.length}
                  </span>
                </div>
              </h3>
              {groupedUsers.onlineUsers.map((user) => (
                <UserListItem key={user.id} user={user} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
