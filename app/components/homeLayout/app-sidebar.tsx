import * as React from 'react';
import { NavUser } from '#/components/homeLayout/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from '#/components/ui/sidebar';
import { ThemeSwitch } from '#/routes/resources/theme-switch';
import { useRequestInfo } from '#/utils/request-info';
import { NavRooms, type NavRoomItem } from '#/components/homeLayout/nav-room';

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
      </SidebarContent>
      <SidebarRail />
      <SidebarSeparator />
      <SidebarFooter>
        <ThemeSwitch userPreference={requestInfo?.userPrefs?.theme} />
      </SidebarFooter>
    </Sidebar>
  );
}
