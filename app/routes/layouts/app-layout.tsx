import {
  Outlet,
  useLoaderData,
  Link,
  type LoaderFunctionArgs,
} from 'react-router';
import { prisma } from '#/utils/db.server';
import { requireUserId, logout } from '#/utils/auth.server';
import { AppSidebar } from '#/components/homeLayout/app-sidebar';
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

type Room = {
  id: string;
  name?: string | null;
};

// --- 1. CORRECTED LOADER ---
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
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

  if (!user) {
    throw await logout(request);
  }

  const groupRooms = await prisma.room.findMany({
    where: {
      NOT: {
        name: {
          startsWith: 'dm:',
        },
      },
    },
    select: {
      id: true,
      name: true,
      icon: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // 2. Fetch ONLY the DMs that this specific user is a member of
  const userDms = await prisma.room.findMany({
    where: {
      name: {
        startsWith: 'dm:',
      },
      members: {
        some: {
          id: userId,
        },
      },
      hiddenBy: {
        none: {
          userId: userId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      members: {
        select: { id: true, name: true, image: { select: { id: true } } },
      },
    },
  });

  // 3. Process the user's DMs to get the other participant's info
  const directMessages = userDms.map((room) => {
    const otherUser = room.members.find((member) => member.id !== userId);
    return {
      id: room.id,
      name: otherUser?.name ?? 'Direct Message',
      userImage: otherUser?.image ?? null,
    };
  });

  // Pass all the data to the component
  return { user, groupRooms, directMessages };
}

// --- 2. LAYOUT COMPONENT (No changes needed here) ---
export default function AppLayout() {
  const { user, groupRooms, directMessages } = useLoaderData<typeof loader>();

  return (
    <SidebarProvider>
      <AppSidebar
        user={user}
        rooms={groupRooms}
        directMessages={directMessages}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            {/* <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            /> */}
            {/* <Breadcrumb>
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
            </Breadcrumb> */}
          </div>
        </header>

        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
