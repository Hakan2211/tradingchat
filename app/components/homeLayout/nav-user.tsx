import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '#/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import { Form, Link } from 'react-router';
import { getUserImagePath } from '#/utils/misc';
import LogoutCircleIcon from '#/icons/logoutCircleIcon';
import { UserRoundIcon } from 'lucide-react';

type NavUserProps = {
  user: {
    id: string;
    name: string | null;
    email: string;
    username: string | null;
    image?: {
      id: string;
      contentType: string;
      altText?: string | null;
    } | null;
  };
};

export function NavUser({ user }: NavUserProps) {
  const userInitial = user.name
    ? user.name.charAt(0).toUpperCase()
    : user.email.charAt(0).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          className="!p-0 group-data-[collapsible=icon]:p-0! "
          tooltip={{
            children: 'My Account',
            side: 'bottom',
            // sideOffset: 10,
            align: 'start',
            alignOffset: 10,
          }}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg" className="w-full">
                <Avatar className="size-8 aspect-square rounded-lg cursor-pointer">
                  <AvatarImage
                    src={
                      user.image?.id
                        ? getUserImagePath(user.image.id)
                        : undefined
                    }
                    alt={user.image?.altText ?? user.name ?? 'User'}
                    width={32}
                    height={32}
                  />
                  <AvatarFallback className="rounded-lg aspect-square bg-emerald-700 text-primary-foreground">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.name ?? 'User'}
                  </span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="max-w-64 p-2"
              align="start"
              side="top"
              sideOffset={4}
            >
              <DropdownMenuLabel className="flex min-w-0 flex-col py-0 px-1 mb-2">
                <span className="truncate text-sm font-medium text-foreground mb-0.5">
                  {user.name || user.username}
                </span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserRoundIcon className="gap-3" />
                <Link to={`/user/${user.id}`}>Profile</Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="gap-3"
                asChild
              >
                <Form method="post" action="/logout" className="w-full">
                  <button type="submit" className="w-full flex items-center">
                    <LogoutCircleIcon className="w-4 h-4 mr-2" />
                    <span>Log out</span>
                  </button>
                </Form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
