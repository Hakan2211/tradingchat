import * as React from 'react';
import { NavMain, type NavMainItem } from '#/components/homeLayout/nav-main';
import { NavUser } from '#/components/homeLayout/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '#/components/ui/sidebar';
import { ThemeSwitch } from '#/routes/resources/theme-switch';
import { useRequestInfo } from '#/utils/request-info';

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
  navItems: NavMainItem[];
};

export function AppSidebar({
  user,
  navItems,
  ...props
}: AppSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const requestInfo = useRequestInfo();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <NavUser user={user} />
      </SidebarHeader>
      <SidebarContent>{/* <NavMain items={navItems} /> */}</SidebarContent>
      <SidebarRail />
      <SidebarFooter>
        <ThemeSwitch userPreference={requestInfo?.userPrefs?.theme} />
      </SidebarFooter>
    </Sidebar>
  );
}
