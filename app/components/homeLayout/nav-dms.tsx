// app/components/homeLayout/nav-dms.tsx

import { NavLink, useFetcher, useLocation } from 'react-router';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuButton,
} from '#/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { getUserImagePath } from '#/utils/misc';
import { EllipsisVertical, Trash, Mail, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import { Button } from '#/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible';
import { Badge } from '#/components/ui/badge';

export type NavDmItem = {
  id: string;
  name: string;
  userImage: { id: string } | null;
};

export function NavDms({
  items,
  unreadCounts,
}: {
  items: NavDmItem[];
  unreadCounts: Record<string, number>;
}) {
  const hideFetcher = useFetcher();

  if (!items.length) return null;

  return (
    <SidebarMenu className="mt-2">
      <Collapsible asChild defaultOpen={true} className="group/collapsible">
        <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          {/* The main trigger for the "Direct Messages" section */}
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip="Direct Messages">
              <Mail className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">
                Direct Messages
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
                    <NavLink to={`/chat/${item.id}`} end className="flex-grow">
                      {({ isActive }) => (
                        <SidebarMenuSubButton
                          asChild
                          isActive={isActive}
                          className="gap-2"
                        >
                          <div className="flex w-full items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Avatar className="h-5 w-5">
                                <AvatarImage
                                  src={
                                    item.userImage
                                      ? getUserImagePath(item.userImage.id)
                                      : undefined
                                  }
                                />
                                <AvatarFallback>
                                  {item.name[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                        >
                          <EllipsisVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start">
                        <hideFetcher.Form
                          method="post"
                          action="/resources/hide-dm"
                        >
                          <input type="hidden" name="roomId" value={item.id} />

                          <DropdownMenuItem asChild>
                            <button type="submit" className="w-full">
                              <Trash className="mr-2 h-4 w-4" />
                              Delete Chat
                            </button>
                          </DropdownMenuItem>
                        </hideFetcher.Form>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
