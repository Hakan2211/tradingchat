import { NavLink } from 'react-router';
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
import { Badge } from '#/components/ui/badge';

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

export function NavRooms({
  items,
  unreadCounts,
}: {
  items: NavRoomItem[];
  unreadCounts: Record<string, number>;
}) {
  if (!items.length) {
    return null;
  }
  return (
    <SidebarMenu className="mt-2">
      <Collapsible asChild defaultOpen={true} className="group/collapsible">
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
              {items.map((item) => {
                const unreadCount = unreadCounts[item.id] || 0;

                return (
                  <SidebarMenuSubItem
                    className="group flex items-center justify-between"
                    key={item.id}
                  >
                    <NavLink className="flex-grow" to={`/chat/${item.id}`} end>
                      {({ isActive }) => (
                        <SidebarMenuSubButton asChild isActive={isActive}>
                          <div className="flex w-full items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                              {/* Render our dynamic icon component */}
                              <RoomIcon iconName={item.icon} />
                              <span className="capitalize">{item.name}</span>
                            </div>
                            {unreadCount > 0 && (
                              <Badge variant="outline" className="ml-2">
                                {unreadCount}
                              </Badge>
                            )}
                          </div>
                        </SidebarMenuSubButton>
                      )}
                    </NavLink>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  );
}
