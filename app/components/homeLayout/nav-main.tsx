import { Link, NavLink, useLocation } from 'react-router';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible';
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

export type NavMainItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  items?: { title: string; url: string }[];
};

export function NavMain({ items }: { items: NavMainItem[] }) {
  const location = useLocation();

  // Helper to check if any sub-item is the active link
  const isSectionActive = (item: NavMainItem) => {
    return (
      item.items?.some((sub) => location.pathname.startsWith(sub.url)) ?? false
    );
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            {item.items ? (
              // --- COLLAPSIBLE SECTION ---
              <Collapsible defaultOpen={isSectionActive(item)}>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        {/* REPLICATING YOUR EXACT PATTERN FOR SUB-ITEMS */}
                        <NavLink to={subItem.url} end>
                          {({ isActive }) => (
                            <SidebarMenuSubButton isActive={isActive}>
                              <span>{subItem.title}</span>
                            </SidebarMenuSubButton>
                          )}
                        </NavLink>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              // --- SIMPLE LINK SECTION ---
              // REPLICATING YOUR EXACT PATTERN FOR TOP-LEVEL ITEMS
              <NavLink to={item.url} end>
                {({ isActive }) => (
                  <SidebarMenuButton isActive={isActive}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                )}
              </NavLink>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
