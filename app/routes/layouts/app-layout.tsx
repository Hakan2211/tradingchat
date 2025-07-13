import {
  Outlet,
  useLoaderData,
  useRevalidator,
  useParams,
  useLocation,
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
import { type Socket, io as socketIo } from 'socket.io-client';
import React from 'react';
import { UserStatus } from '@prisma/client';
import { toast } from 'sonner';
import { redirectWithToast } from '#/utils/toaster.server';
import { isUserAuthorized } from '#/utils/permission.server';

type DirectMessageItem = {
  id: string;
  name: string;
  userImage: { id: string } | null;
};

//SocketProvider and Context
type SocketContextType = {
  socket: Socket | null;
  onlineUserIds: Set<string>;
  userStatuses: Map<string, UserStatus>;
  isReady: boolean;
  directMessages: DirectMessageItem[];
  unreadCounts: Record<string, number>;
  addDmToList: (dm: DirectMessageItem) => void;
};

const SocketContext = React.createContext<SocketContextType | null>(null);

export const useSocketContext = () => {
  const context = React.useContext(SocketContext);
  // Always return consistent values during SSR
  if (typeof window === 'undefined' || !context) {
    return {
      socket: null,
      onlineUserIds: new Set<string>(),
      userStatuses: new Map<string, UserStatus>(),
      isReady: false,
      directMessages: [],
      unreadCounts: {},
      addDmToList: () => {},
    };
  }

  return context;
};

function SocketProvider({
  user,
  children,
  initialDms,
  initialUnreadCounts,
}: {
  user: { id: string };
  children: React.ReactNode;
  initialDms: DirectMessageItem[];
  initialUnreadCounts: Record<string, number>;
}) {
  const revalidator = useRevalidator();
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [onlineUserIds, setOnlineUserIds] = React.useState<Set<string>>(
    new Set()
  );
  const [userStatuses, setUserStatuses] = React.useState<
    Map<string, UserStatus>
  >(new Map());

  const [isReady, setIsReady] = React.useState(false);
  const [isWaitingForUsers, setIsWaitingForUsers] = React.useState(false);

  const [directMessages, setDirectMessages] =
    React.useState<DirectMessageItem[]>(initialDms);

  const [unreadCounts, setUnreadCounts] =
    React.useState<Record<string, number>>(initialUnreadCounts);

  const params = useParams();
  const location = useLocation();
  const currentRoomIdRef = React.useRef(params.roomId);

  // Effect to clear badge count when user enters a room
  React.useEffect(() => {
    currentRoomIdRef.current = params.roomId;
    if (params.roomId && unreadCounts[params.roomId]) {
      setUnreadCounts((prev) => {
        const newCounts = { ...prev };
        delete newCounts[params.roomId ?? ''];
        return newCounts;
      });
    }
  }, [params.roomId, location.pathname]);

  React.useEffect(() => {
    if (!user?.id) {
      return;
    }

    const newSocket = socketIo(window.location.origin, {
      auth: { userId: user.id },
    });
    setSocket(newSocket);

    const handleDmActivated = (dmData?: {
      id: string;
      name: string;
      userImage: { id: string } | null;
    }) => {
      if (dmData) {
        // Surgical state update: add the new DM to the list
        setDirectMessages((prev) => {
          // Check if this DM is already in the list
          if (prev.some((dm) => dm.id === dmData.id)) {
            return prev;
          }
          return [...prev, dmData];
        });
      } else {
        // Fallback: if no data provided, use revalidation
        revalidator.revalidate();
      }
    };

    const handleDmHidden = (roomId: string) => {
      // Surgical state update: remove the DM from the list
      setDirectMessages((prev) => prev.filter((dm) => dm.id !== roomId));
    };

    // ----- SETUP FOR GLOBAL LISTENERS -----

    const handleOnlineUsers = (data: {
      userIds: string[];
      statuses: Record<string, UserStatus>;
    }) => {
      setOnlineUserIds(new Set(data.userIds));
      setUserStatuses(new Map(Object.entries(data.statuses)));
      setIsReady(true);
      setIsWaitingForUsers(false);
    };

    const handleUserOnline = ({
      userId,
      status,
    }: {
      userId: string;
      status: UserStatus;
    }) => {
      setOnlineUserIds((prev) => new Set(prev).add(userId));
      setUserStatuses((prev) => new Map(prev).set(userId, status));
    };
    const handleUserOffline = ({ userId }: { userId: string }) => {
      setOnlineUserIds((prev) => {
        const newIds = new Set(prev);
        newIds.delete(userId);
        return newIds;
      });
    };

    const handleStatusChanged = ({
      userId,
      status,
    }: {
      userId: string;
      status: UserStatus;
    }) => {
      setUserStatuses((prev) => new Map(prev).set(userId, status));
    };

    const handleNotification = (data: {
      roomId: string;
      unreadCount: number;
      sender: { name: string };
    }) => {
      const { roomId, unreadCount, sender } = data;

      if (roomId !== currentRoomIdRef.current) {
        setUnreadCounts((prev) => ({ ...prev, [roomId]: unreadCount }));

        toast.info(`New message from ${sender.name}`, {
          id: `new-message-${roomId}`,
        });

        if (document.hidden) {
          document.title = `(1) New Message! | TradingChat`;
        }
      }
    };

    // Attach all GLOBAL listeners

    newSocket.on('dm.activated', handleDmActivated);
    newSocket.on('dm.hidden', handleDmHidden);
    newSocket.on('online.users', handleOnlineUsers);
    newSocket.on('user.online', handleUserOnline);
    newSocket.on('user.offline', handleUserOffline);
    newSocket.on('user.status.changed', handleStatusChanged);
    newSocket.on('notification', handleNotification);

    // Function to request user list with retry logic
    const requestUserList = () => {
      if (isWaitingForUsers) {
        console.log(
          'SocketProvider: Already waiting for users, skipping duplicate request'
        );
        return;
      }

      setIsWaitingForUsers(true);
      newSocket.emit('client.ready.get_users');
      console.log('SocketProvider: Sent request for user list.');
    };

    // Initial request
    requestUserList();

    // Set up heartbeat/retry mechanism
    const heartbeatInterval = setInterval(() => {
      if (isWaitingForUsers && !isReady) {
        console.log(
          'SocketProvider: Heartbeat timeout - retrying user list request'
        );
        requestUserList();
      }
    }, 5000); // 5 second timeout

    // ----- CLEANUP FOR GLOBAL LISTENERS -----
    return () => {
      clearInterval(heartbeatInterval); // Clear the heartbeat interval
      newSocket.off('dm.activated', handleDmActivated);
      newSocket.off('dm.hidden', handleDmHidden);
      newSocket.off('online.users', handleOnlineUsers);
      newSocket.off('user.online', handleUserOnline);
      newSocket.off('user.offline', handleUserOffline);
      newSocket.off('user.status.changed', handleStatusChanged);
      newSocket.off('notification', handleNotification);
      newSocket.disconnect();
      setIsReady(false);
      setIsWaitingForUsers(false);
      setSocket(null);
    };
  }, [user?.id, revalidator]);

  const addDmToList = React.useCallback((dm: DirectMessageItem) => {
    setDirectMessages((prev) => {
      if (prev.some((existingDm) => existingDm.id === dm.id)) {
        return prev;
      }
      return [...prev, dm];
    });
  }, []);

  const contextValue = React.useMemo(
    () => ({
      socket: socket,
      onlineUserIds: onlineUserIds,
      userStatuses: userStatuses,
      isReady: isReady,
      directMessages: directMessages,
      unreadCounts: unreadCounts,
      addDmToList,
    }),
    [
      socket,
      onlineUserIds,
      userStatuses,
      isReady,
      directMessages,
      unreadCounts,
      addDmToList,
    ]
  );

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  console.log('AppLayout loader: Starting...');
  const userId = await requireUserId(request);

  // First, check authorization using the new function
  const userForAuth = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roles: { select: { name: true } },
      subscription: { select: { status: true, currentPeriodEnd: true } },
    },
  });

  // Use our new, single source of truth to check for access.
  if (!isUserAuthorized(userForAuth)) {
    const toast = {
      title: 'Subscription Expired',
      description:
        'Your trial or subscription has ended. Please choose a plan to continue.',
      type: 'message' as const,
    };

    // Log the user out. The logout function handles destroying the session and cookie.
    const logoutResponse = await logout(request);
    return redirectWithToast('/pricing', toast, logoutResponse);
  }

  // If the check passes, they are authorized. Continue with the rest of the loader.
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const currentRoomId = pathSegments[2] === 'chat' ? pathSegments[3] : null;

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
      OR: [
        {
          messages: {
            some: {},
          },
        },
        ...(currentRoomId ? [{ id: currentRoomId }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      members: {
        select: { id: true, name: true, image: { select: { id: true } } },
      },
    },
  });

  const unreadMessages = await prisma.unreadMessage.findMany({
    where: { userId },
    select: { roomId: true, count: true },
  });

  const unreadCounts = Object.fromEntries(
    unreadMessages.map((um) => [um.roomId, um.count])
  );

  const directMessages = userDms.map((room) => {
    const otherUser = room.members.find((member) => member.id !== userId);
    return {
      id: room.id,
      name: otherUser?.name ?? 'Direct Message',
      userImage: otherUser?.image ?? null,
    };
  });

  return { user, groupRooms, directMessages, unreadCounts };
}

// --- 2. LAYOUT COMPONENT (No changes needed here) ---
export default function AppLayout() {
  const { user, groupRooms, directMessages, unreadCounts } =
    useLoaderData<typeof loader>();

  return (
    <SocketProvider
      user={user}
      initialDms={directMessages}
      initialUnreadCounts={unreadCounts}
    >
      <SidebarProvider>
        <AppSidebar
          user={user}
          rooms={groupRooms}
          directMessages={directMessages}
        />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 cursor-pointer aspect-square rounded-md p-4 text-sidebar hover:!bg-sidebar-accent hover:!text-sidebar-accent-foreground" />
          </header>
          <main className="flex-1 p-2 md:p-3 h-[calc(100svh-3.5rem)]">
            <div className="h-full w-full text-card-foreground rounded-3xl shadow-sm overflow-hidden">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SocketProvider>
  );
}
