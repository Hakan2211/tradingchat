import * as React from 'react';
import { NavUser } from '#/components/homeLayout/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
} from '#/components/ui/sidebar';
import { ThemeSwitch } from '#/routes/resources/theme-switch';
import { useRequestInfo } from '#/utils/request-info';
import { NavRooms, type NavRoomItem } from '#/components/homeLayout/nav-room';
import { NavLink } from 'react-router';
import { Bookmark } from 'lucide-react';
import { NavDms, type NavDmItem } from '#/components/homeLayout/nav-dms';
import { useSocketContext } from '#/routes/layouts/app-layout';
import { useHydrated } from 'remix-utils/use-hydrated';

type AppSidebarProps = {
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

  rooms: NavRoomItem[];
  directMessages: NavDmItem[];
};

export function AppSidebar({
  user,
  rooms,
  directMessages,
  ...props
}: AppSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const requestInfo = useRequestInfo();
  const { directMessages: socketDms, unreadCounts } = useSocketContext();
  const isHydrated = useHydrated();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <NavUser user={user} />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <NavRooms items={rooms} unreadCounts={unreadCounts} />
        <NavDms
          items={isHydrated ? socketDms : directMessages}
          unreadCounts={unreadCounts}
        />
        <SidebarMenu>
          <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <NavLink to="/bookmarks" end>
              {({ isActive }) => (
                <SidebarMenuButton isActive={isActive} tooltip="Bookmarks">
                  <Bookmark />
                  <span className="group-data-[collapsible=icon]:hidden">
                    Bookmarks
                  </span>
                </SidebarMenuButton>
              )}
            </NavLink>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
      <SidebarSeparator />
      <SidebarFooter>
        <ThemeSwitch userPreference={requestInfo?.userPrefs?.theme} />
      </SidebarFooter>
    </Sidebar>
  );
}
