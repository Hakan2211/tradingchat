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
};

export function AppSidebar({
  user,
  rooms,
  ...props
}: AppSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const requestInfo = useRequestInfo();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <NavUser user={user} />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <NavRooms items={rooms} />
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
