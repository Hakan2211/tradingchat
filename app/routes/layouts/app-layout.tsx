'use client';

import {
  Outlet,
  useLoaderData,
  Link,
  type LoaderFunctionArgs,
} from 'react-router';
// Make sure you have prisma available to import
import { prisma } from '#/utils/db.server';
// Import the specific auth functions we need
import { requireUserId, logout } from '#/utils/auth.server';

import { AppSidebar } from '#/components/homeLayout/app-sidebar';
import { Separator } from '#/components/ui/separator';
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '#/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '#/components/ui/breadcrumb';
import { BookOpen, Bot, SquareTerminal, Settings2 } from 'lucide-react';

// --- 1. CORRECTED LOADER ---
export async function loader({ request }: LoaderFunctionArgs) {
  // Step 1: Protect the route and get the user's ID. This is the correct use of requireUserId.
  const userId = await requireUserId(request);

  // Step 2: Fetch the specific user data needed for this layout using Prisma.
  // This is more explicit and efficient.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      image: {
        select: {
          id: true,
          altText: true,
          contentType: true,
        },
      },
    },
  });

  // Step 3: Handle the edge case where the user ID exists in the session,
  // but the user has been deleted from the database.
  if (!user) {
    // The user doesn't exist, so log them out completely.
    throw await logout(request);
  }

  // Step 4: Prepare the navigation data as before.
  const navItems = [
    { title: 'Home', url: '/home', icon: SquareTerminal },
    {
      title: 'Documentation',
      url: '/docs',
      icon: BookOpen,
      items: [
        { title: 'Introduction', url: '/docs/introduction' },
        { title: 'Get Started', url: '/docs/start' },
      ],
    },
    { title: 'Settings', url: '/settings', icon: Settings2 },
  ];

  // Step 5: Return all the data needed for the layout.
  return { user, navItems };
}

// --- 2. LAYOUT COMPONENT (No changes needed here) ---
export default function AppLayout() {
  const { user, navItems } = useLoaderData<typeof loader>();

  return (
    <SidebarProvider>
      <AppSidebar user={user} navItems={navItems} />

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/home">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
