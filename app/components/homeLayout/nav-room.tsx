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
import { cn } from '#/lib/utils';

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

function RoomIcon({
  iconName,
  className,
}: {
  iconName?: string | null;
  className?: string;
}) {
  const IconComponent = iconName ? iconMap[iconName] : null;
  // Fallback to a default Hash icon if no icon is specified or found
  return IconComponent ? (
    <IconComponent className={className} />
  ) : (
    <Hash className={className} />
  );
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
    <SidebarMenu>
      <Collapsible asChild defaultOpen={true} className="group/collapsible">
        <SidebarMenuItem>
          {/* The main trigger for the "Chat Rooms" section */}
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              className="h-10 text-base cursor-pointer [&>svg]:size-5 hover:!bg-accent/50 hover:!text-accent-foreground"
              tooltip="Rooms"
            >
              <MessageSquare className="size-5" />
              <span className="group-data-[collapsible=icon]:hidden">
                Rooms
              </span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </CollapsibleTrigger>

          {/* The content that expands/collapses */}
          <CollapsibleContent>
            <SidebarMenuSub className="gap-2 mt-1">
              {items.map((item) => {
                const unreadCount = unreadCounts[item.id] || 0;

                return (
                  <SidebarMenuSubItem
                    className="group flex items-center justify-between"
                    key={item.id}
                  >
                    <NavLink className="flex-grow" to={`/chat/${item.id}`} end>
                      {({ isActive }) => (
                        <SidebarMenuSubButton
                          className={cn(
                            'hover:bg-accent/50 hover:text-accent-foreground',
                            isActive && '!bg-accent/60 !text-accent-foreground'
                          )}
                          asChild
                          isActive={isActive}
                        >
                          <div className="flex w-full items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                              {/* Render our dynamic icon component */}
                              <RoomIcon
                                className="size-5"
                                iconName={item.icon}
                              />
                              <span className="capitalize">{item.name}</span>
                            </div>
                            {unreadCount > 0 && (
                              <Badge
                                variant="outline"
                                className="ml-2 h-5 shrink-0 justify-center rounded-full px-2 text-xs font-medium text-primary"
                              >
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
