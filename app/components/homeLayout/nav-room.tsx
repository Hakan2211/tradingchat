import { NavLink, useLocation } from 'react-router';
import {
  Eye,
  MessageCircleMore,
  CircleHelp,
  Hash,
  type LucideIcon,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '#/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible';
import * as React from 'react';

export type NavRoomItem = {
  id: string;
  name: string;
  icon?: string | null;
};

const iconMap: Record<string, LucideIcon> = {
  MessageCircleMore,
  Eye,
  CircleHelp,
};

function RoomIcon({ iconName }: { iconName?: string | null }) {
  const IconComponent = iconName ? iconMap[iconName] : null;
  // Fallback to a default Hash icon if no icon is specified or found
  return IconComponent ? <IconComponent /> : <Hash className="size-4" />;
}

export function NavRooms({ items }: { items: NavRoomItem[] }) {
  const location = useLocation();
  // Helper to check if any chat room link is active, to keep the collapsible open
  const isSectionActive = React.useMemo(() => {
    return items.some((item) =>
      location.pathname.startsWith(`/chat/${item.id}`)
    );
  }, [items, location.pathname]);
  // Don't render anything if there are no rooms
  if (!items.length) {
    return null;
  }

  return (
    <SidebarMenu className="mt-2">
      <Collapsible
        asChild
        defaultOpen={isSectionActive}
        className="group/collapsible"
      >
        <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          {/* The main trigger for the "Chat Rooms" section */}
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip="Rooms">
              <MessageSquare />
              <span className="group-data-[collapsible=icon]:hidden">
                Rooms
              </span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </CollapsibleTrigger>

          {/* The content that expands/collapses */}
          <CollapsibleContent>
            <SidebarMenuSub>
              {items.map((item) => (
                <SidebarMenuSubItem key={item.id}>
                  <NavLink to={`/chat/${item.id}`} end>
                    {({ isActive }) => (
                      <SidebarMenuSubButton asChild isActive={isActive}>
                        <div className="flex items-center gap-2">
                          {/* Render our dynamic icon component */}
                          <RoomIcon iconName={item.icon} />
                          <span className="capitalize">{item.name}</span>
                        </div>
                      </SidebarMenuSubButton>
                    )}
                  </NavLink>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  );
}
