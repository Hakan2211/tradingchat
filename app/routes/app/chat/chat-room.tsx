import * as React from 'react';
import {
  useLoaderData,
  useFetcher,
  useSearchParams,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from 'react-router';
import { z } from 'zod';
import { getFormProps, getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { useSocketContext } from '#/routes/layouts/app-layout';
import type { Server } from 'socket.io';
import { prisma } from '#/utils/db.server';
import { requireUserId } from '#/utils/auth.server';
import { getUserImagePath, invariantResponse } from '#/utils/misc';
import { Button } from '#/components/ui/button';
import TextareaAutosize from 'react-textarea-autosize';
import {
  SendHorizonalIcon,
  type LucideIcon,
  Hash,
  MessageCircleMore,
  Eye,
  CircleHelp,
  X,
  Paperclip,
  ImageIcon,
  UsersRound,
  Handshake,
  Megaphone,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { ChatMessage } from '#/components/chat/chat-message';
import { requirePermission } from '#/utils/permission.server';
import { parseFormData, type FileUpload } from '@mjackson/form-data-parser';
import { processImage } from '#/utils/image.server';
import { uploadImageToR2, deleteImageFromR2 } from '#/utils/r2.server';
import { getChatImagePath } from '#/utils/misc';
import { DateBadge, shouldShowDateBadge } from '#/components/chat/dateBadge';
import { UserList } from '#/components/chat/userList';
import { getUserListVisibility } from '#/utils/userlist.server';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { useInfiniteMessages } from '#/hooks/use-infinite-messages';
import { useVirtualizer } from '@tanstack/react-virtual';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar } from '#/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip';

const MAX_CHAT_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MESSAGE_PAGE_SIZE = 200; // Increased for better virtualization performance
const VIRTUALIZATION_THRESHOLD = 100; // Consider non-virtualized approach for smaller lists

type MessageWithUser = {
  id: string;
  content: string | null;
  createdAt: Date;
  roomId: string;
  isDeleted: boolean;
  bookmarks: {
    id: string;
    userId: string;
    messageId: string;
  }[];
  image: {
    id: string;
    altText: string | null;
  } | null;
  user: {
    id: string;
    name: string | null;
    image: { id: string } | null;
    username: string | null;
  } | null;
  replyTo: {
    content: string | null;
    user: { name: string | null } | null;
    createdAt: Date;
    image: {
      id: string;
      altText: string | null;
    } | null;
  } | null;
};

const iconMap: Record<string, LucideIcon> = {
  MessageCircleMore,
  Eye,
  CircleHelp,
  Handshake,
  Megaphone,
};

function RoomIcon({ iconName }: { iconName?: string | null }) {
  const IconComponent = iconName ? iconMap[iconName] : null;
  // Fallback to a default Hash icon if no icon is specified or found
  return IconComponent ? (
    <IconComponent className="size-6 text-muted-foreground" />
  ) : (
    <Hash className="size-6 text-muted-foreground" />
  );
}

//----------------------Schemas-------------------------------------------------------------------------------
const MessageSchema = z.object({
  content: z
    .string()
    .trim()
    .max(1000, 'Message cannot be more than 1000 characters')
    .transform((val) => (val === '' ? undefined : val))
    .optional(),
  replyToId: z.string().optional(),
});

const EditMessageSchema = z.object({
  messageId: z.string(),
  content: z.string().min(1, 'Message cannot be empty').max(1000),
});

const ChatImageSchema = z.object({
  chatImage: z.instanceof(File).optional(),
});

//----------------------Loader Function-------------------------------------------------------------------------------
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { roomId } = params;
  invariantResponse(roomId, 'Room ID is required', { status: 404 });

  //--------------------------Virtualized Messages---------------------------------------------------------------
  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor');
  const dateParam = url.searchParams.get('date');

  // Determine the date range for the query. Default to today if no date is provided or if the format is invalid.
  const selectedDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? new Date(dateParam)
      : new Date();

  // Set timezone to UTC for server-side calculations to avoid timezone issues.
  const startOfDay = new Date(selectedDate.toISOString().slice(0, 10));
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const messageQuery = {
    where: {
      roomId,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      roomId: true,
      isDeleted: true,
      bookmarks: {
        where: { userId },
        select: { id: true, userId: true, messageId: true },
      },
      image: { select: { id: true, altText: true } },
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: { select: { id: true } },
        },
      },
      replyTo: {
        select: {
          content: true,
          user: { select: { name: true } },
          createdAt: true,
          image: { select: { id: true, altText: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' as const },
    take: MESSAGE_PAGE_SIZE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  };

  const messages = await prisma.message.findMany(messageQuery as any);
  const hasMore = messages.length === MESSAGE_PAGE_SIZE;
  messages.reverse();

  if (cursor) {
    return { messages, hasMore };
  }

  //--------------------------User List-------------------------------------------------------------------------------
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      bookmarks: {
        where: {
          userId: userId,
        },
        select: {
          userId: true,
        },
      },
      // Select all the fields your `userHasPermission` needs
      roles: {
        select: {
          name: true,
          permissions: {
            select: { action: true, entity: true, access: true },
          },
        },
      },
    },
  });

  // Fetch all users for the user list
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      image: { select: { id: true } },
      roles: {
        select: {
          name: true,
        },
      },
      status: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Clear unread messages for this room and user
  await prisma.unreadMessage.deleteMany({
    where: {
      userId: userId,
      roomId: roomId,
    },
  });

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      name: true,
      icon: true,
      members: {
        select: {
          id: true,
          name: true,
          image: { select: { id: true } },
        },
      },
    },
  });
  invariantResponse(room, 'Room not found', { status: 404 });

  const userListVisibility = await getUserListVisibility(request);

  return { room, user, allUsers, userListVisibility, messages, hasMore };
}

//----------------------Action Function-------------------------------------------------------------------------------
export async function action({ request, params, context }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { roomId } = params;
  invariantResponse(roomId, 'Cannot submit message without a room ID');

  const formData = await parseFormData(request, {
    maxFileSize: MAX_CHAT_IMAGE_SIZE,
  });

  const intent = formData.get('intent');

  const imageFile = formData.get('chatImage') as FileUpload | string | null;

  let imageCreateData: {
    contentType: string;
    objectKey: string;
    altText: string;
  } | null = null;

  // 1. Prepare the image data, but DON'T create the DB record yet.
  if (imageFile && typeof imageFile !== 'string' && imageFile.size > 0) {
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const { data: optimizedBuffer, contentType } = await processImage(
      imageBuffer
    );
    const { objectKey } = await uploadImageToR2(
      optimizedBuffer,
      contentType,
      userId
    );

    imageCreateData = {
      contentType,
      objectKey,
      altText: imageFile.name,
    };
  }

  // --- DELETE INTENT LOGIC ---
  if (intent === 'deleteMessage') {
    const messageId = formData.get('messageId');
    invariantResponse(typeof messageId === 'string', 'Message ID is required');

    // 1. Check for replies AT THE SAME TIME we fetch the message for permission checks.
    // This is highly efficient.
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        userId: true,
        _count: {
          select: { replies: true }, // Prisma can count related records for us
        },
        image: { select: { id: true, objectKey: true } },
      },
    });
    invariantResponse(message, 'Message not found', { status: 404 });

    // Your permission check remains the same
    await requirePermission(
      request,
      'delete:message',
      message.userId || undefined
    );

    const hasReplies = message._count.replies > 0;
    const { io } = context as { io: Server };
    const objectKeyToDelete = message.image?.objectKey;

    // 2. THE CONDITIONAL LOGIC
    if (hasReplies) {
      // --- SOFT DELETE PATH ---
      // We still delete the image from R2, as the message is effectively gone.
      const updatedMessage = await prisma.$transaction(async (tx) => {
        // Step 1: Update the message to perform the soft delete AND sever the link to the image.
        const msgUpdate = await tx.message.update({
          where: { id: messageId },
          data: {
            content: '[message deleted]',
            isDeleted: true,
            userId: null,
          },
          select: {
            id: true,
            content: true,
            isDeleted: true,
            image: true,
            user: true,
          },
        });

        // Step 2: Now that the link is broken, safely delete the ChatImage record.
        if (message.image) {
          await tx.chatImage.delete({
            where: { id: message.image.id },
          });
        }

        return msgUpdate;
      });

      // 2. AFTER the database transaction succeeds, delete the file from R2.
      if (objectKeyToDelete) {
        await deleteImageFromR2(objectKeyToDelete);
      }

      io.to(roomId).emit('messageEdited', updatedMessage);
    } else {
      // --- HARD DELETE PATH (This was already correct) ---
      // The `onDelete: Cascade` in your schema handles this case correctly.
      // When the message is deleted, Prisma tells the DB to also delete the related ChatImage.
      await prisma.message.delete({ where: { id: messageId } });

      // Delete from R2 after the database operation is successful.
      if (objectKeyToDelete) {
        await deleteImageFromR2(objectKeyToDelete);
      }

      io.to(roomId).emit('messageDeleted', { messageId });
    }

    return { status: 'success' as const };
  }

  if (intent === 'editMessage') {
    const submission = parseWithZod(formData, { schema: EditMessageSchema });
    if (submission.status !== 'success') {
      return submission.reply();
    }
    const { messageId, content } = submission.value;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { userId: true },
    });
    invariantResponse(message, 'Message not found', { status: 404 });

    // Use your existing permission checker for "update"
    await requirePermission(
      request,
      'update:message',
      message.userId || undefined
    );

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { content },
      select: { id: true, content: true }, // Select what we need to broadcast
    });

    // Broadcast the edit to all clients
    const { io } = context as { io: Server };
    io.to(roomId).emit('messageEdited', updatedMessage);

    return { status: 'success' as const };
  }

  //------Bookmark Intent Logic------
  if (intent === 'toggleBookmark') {
    const messageId = formData.get('messageId');
    invariantResponse(typeof messageId === 'string', 'Message ID is required');

    // try {
    //   const message = await prisma.message.findUnique({
    //     where: { id: messageId },
    //     select: { id: true },
    //   });

    //   if (!message) {
    //     throw new Error('Message not found');
    //   }

    const existingBookmark = await prisma.bookmark.findUnique({
      where: { userId_messageId: { userId, messageId } },
      select: { id: true },
    });

    let isNowBookmarked: boolean;

    if (existingBookmark) {
      await prisma.bookmark.delete({ where: { id: existingBookmark.id } });
      isNowBookmarked = false;
    } else {
      await prisma.bookmark.create({
        data: {
          userId,
          messageId,
        },
      });
      isNowBookmarked = true;
    }

    // Note: No socket broadcast is needed as this is a private user action.
    return {
      status: 'success' as const,
      toggledMessageId: messageId,
      bookmarked: isNowBookmarked,
    };

    // } catch (error) {
    //   console.error('Bookmark toggle error:', error);
    //   throw new Error('Failed to toggle bookmark');
    // }
  }

  const submission = parseWithZod(formData, { schema: MessageSchema });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  invariantResponse(
    submission.value.content || imageCreateData,
    'A message must have content or an image.'
  );

  const { io } = context as { io: Server };
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { name: true, members: { select: { id: true } } },
  });

  invariantResponse(room, 'Room not found', { status: 404 });

  if (room && room.name.startsWith('dm:')) {
    // Find the other user in the room
    const otherMember = room.members.find((member) => member.id !== userId);
    if (otherMember) {
      // 1. Un-hide the room for the receiver.
      await prisma.hiddenRoom.deleteMany({
        where: {
          roomId: roomId,
          userId: otherMember.id,
        },
      });

      // 2. Get the sender's info for the DM data
      const sender = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, image: { select: { id: true } } },
      });

      // 3. Send the actual DM data to the receiver's client
      if (sender) {
        const dmData = {
          id: roomId,
          name: sender.name ?? 'Direct Message',
          userImage: sender.image,
        };
        io.to(`user:${otherMember.id}`).emit('dm.activated', dmData);
      }
    }
  }

  const newMessage = await prisma.message.create({
    data: {
      content: submission.value.content || undefined,
      roomId,
      userId,
      replyToId: submission.value.replyToId,
      // Use a nested 'create' if we have image data.
      // This creates BOTH records and links them automatically.
      ...(imageCreateData && {
        image: {
          create: imageCreateData,
        },
      }),
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      roomId: true,
      isDeleted: true,
      image: { select: { id: true, altText: true } },
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: { select: { id: true } },
        },
      },
      replyTo: {
        select: {
          content: true,
          user: { select: { name: true } },
          createdAt: true,
          image: { select: { id: true, altText: true } },
        },
      },
      bookmarks: true,
    },
  });
  const messageToBroadcast = newMessage;
  io.to(roomId).emit('newMessage', messageToBroadcast);

  const socketsInRoom = await io.in(roomId).fetchSockets();
  const activeUserIdsInRoom = new Set(
    socketsInRoom.map((socket) => socket.handshake.auth.userId as string)
  );

  // 2. Determine who should get a notification.
  // Recipients are all room members MINUS the sender AND MINUS anyone actively in the room.
  const recipientsToNotify = room.members.filter(
    (member) => member.id !== userId && !activeUserIdsInRoom.has(member.id)
  );

  // 3. Loop through only the recipients who are NOT in the room to create/update their unread records.
  for (const recipient of recipientsToNotify) {
    const unreadRecord = await prisma.unreadMessage.upsert({
      where: { userId_roomId: { userId: recipient.id, roomId } },
      create: { userId: recipient.id, roomId, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });

    // 4. Emit a notification event ONLY to that specific user's personal channel.
    io.to(`user:${recipient.id}`).emit('notification', {
      roomId: roomId,
      unreadCount: unreadRecord.count,
      sender: {
        name: newMessage.user?.name ?? 'Someone',
      },
    });
  }

  return submission.reply();
}

//----------------------Component Function UI----------------------------------------------------------------------

export default function ChatRoom() {
  const { room, user, allUsers, userListVisibility, ...initialMessagesData } =
    useLoaderData<typeof loader>();

  // Early returns for safety
  if (!room || !user) {
    return <div>Loading...</div>;
  }

  const { socket, onlineUserIds, userStatuses, isReady } = useSocketContext();
  const {
    messages,
    setMessages,
    hasMore,
    isLoading,
    loadMore,
    addMessage,
    deleteMessage,
    editMessage,
    updateBookmark,
  } = useInfiniteMessages(initialMessagesData);

  const [searchParams, setSearchParams] = useSearchParams();
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(
    null
  );
  const [replyingTo, setReplyingTo] = React.useState<MessageWithUser | null>(
    null
  );
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isUsersListVisible, setIsUsersListVisible] =
    React.useState(userListVisibility);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  // Memoize the selected date to avoid re-calculating on every render
  const selectedDate = React.useMemo(() => {
    const dateParam = searchParams.get('date');
    const today = new Date();
    // Use a more robust date parsing and validation
    if (dateParam) {
      const date = new Date(dateParam + 'T00:00:00'); // Specify time to avoid timezone shifts
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return today;
  }, [searchParams]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Create a fresh URLSearchParams object to avoid issues with stale state.
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('date', format(date, 'yyyy-MM-dd'));
      newSearchParams.delete('cursor'); // Reset pagination when date changes
      setSearchParams(newSearchParams, { preventScrollReset: true });
      setIsCalendarOpen(false); // Close the popover after selection
    }
  };

  const userListFetcher = useFetcher<typeof action>();

  const messageFetcher = useFetcher<typeof action>();
  const deleteFetcher = useFetcher<typeof action>();
  const bookmarkFetcher = useFetcher<typeof action>();
  const formRef = React.useRef<HTMLFormElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const stagedFileRef = React.useRef<File | null>(null);
  // Ref for the scroll viewport
  const scrollViewportRef = React.useRef<HTMLDivElement>(null);

  // Height cache for better performance
  const heightCache = React.useRef(new Map<string, number>());

  // Clear cache when switching rooms
  React.useEffect(() => {
    if (messages.length === 0) {
      heightCache.current.clear();
    }
  }, [room?.id]);

  // Optimized height estimation with caching
  const estimateSize = React.useCallback(
    (index: number) => {
      if (hasMore && index === 0) return 60; // Loading indicator
      const messageIndex = hasMore ? index - 1 : index;
      const message = messages[messageIndex];
      if (!message) return 100;

      // Check cache first
      const cached = heightCache.current.get(message.id);
      if (cached) return cached;

      // Calculate estimate
      let estimatedHeight = 60; // Base height for user info + padding

      if (message.content) {
        // Rough estimation: ~20px per line, assuming ~50 chars per line
        const lines = Math.ceil((message.content.length || 0) / 50);
        estimatedHeight += lines * 20;
      }

      if (message.image) {
        estimatedHeight += 200; // Image height
      }

      if (message.replyTo) {
        estimatedHeight += 40; // Reply preview height
      }

      const finalHeight = Math.max(estimatedHeight, 60);

      // Cache the result
      heightCache.current.set(message.id, finalHeight);

      // Optional: Limit cache size for long sessions
      if (heightCache.current.size > 1000) {
        const entries = Array.from(heightCache.current.entries());
        heightCache.current = new Map(entries.slice(-500)); // Keep last 500
      }

      return finalHeight;
    },
    [messages, hasMore]
  );

  // --- Hybrid Virtualization Approach ---
  const shouldVirtualize = messages.length > VIRTUALIZATION_THRESHOLD;

  // --- Virtualizer Setup (only when virtualizing) ---
  const rowVirtualizer = useVirtualizer({
    count: hasMore ? messages.length + 1 : messages.length,
    getScrollElement: () => scrollViewportRef.current,
    estimateSize,
    overscan: 3, // Reduced from 5
    // Enable measuring for accurate heights
    measureElement: (element) => {
      return element?.getBoundingClientRect().height ?? 0;
    },
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  // --- CLEAN SCROLL MANAGEMENT ---
  const isUserNearBottomRef = React.useRef(true);
  const hasInitialScrolledRef = React.useRef(false);

  // Helper to scroll to bottom with smooth animation
  const scrollToBottom = React.useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    // Always scroll the container to its max scrollHeight,
    // using smooth behavior for both virtualized and non-virtualized lists
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: 'smooth',
    });
  }, []);

  // Track whether user is near bottom
  React.useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      isUserNearBottomRef.current =
        scrollHeight - scrollTop - clientHeight < 100;
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset initial scroll flag when room changes
  React.useEffect(() => {
    hasInitialScrolledRef.current = false;
  }, [room?.id]);

  // Scroll to bottom on initial load and when room changes (instant, non-smooth)
  React.useEffect(() => {
    if (messages.length > 0 && !isLoading && !hasInitialScrolledRef.current) {
      // Wait for DOM to be fully updated and measured
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const viewport = scrollViewportRef.current;
          if (!viewport) return;

          // Instant scroll to bottom when entering a room
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: 'auto', // instant, not smooth
          });

          // Mark that we've done the initial scroll for this room
          hasInitialScrolledRef.current = true;
        });
      });
    }
  }, [messages.length, isLoading]); // Check whenever messages or loading state changes

  // Load more trigger for virtualized lists
  React.useEffect(() => {
    if (!shouldVirtualize || !virtualItems.length) return;
    const firstItem = virtualItems[0];
    const shouldLoadMore = firstItem?.index === 0 && hasMore && !isLoading;

    if (shouldLoadMore) {
      loadMore();
    }
  }, [virtualItems, hasMore, isLoading, loadMore, shouldVirtualize]);

  // Socket handler: only handle state updates
  React.useEffect(() => {
    if (!socket || !room) return;
    socket.emit('joinRoom', room.id);

    const onNew = (msg: MessageWithUser) => {
      if (msg.roomId === room.id) addMessage(msg);
    };
    socket.on('newMessage', onNew);
    socket.on('messageDeleted', ({ messageId }) => deleteMessage(messageId));
    socket.on('messageEdited', editMessage);

    return () => {
      socket.emit('leaveRoom', room.id);
      socket.off('newMessage', onNew);
      socket.off('messageDeleted');
      socket.off('messageEdited');
    };
  }, [socket, room?.id, addMessage, deleteMessage, editMessage]);

  // After messages update, if the user is at the bottom, smooth scroll down
  React.useEffect(() => {
    if (isUserNearBottomRef.current) {
      // Wait two RAFs so the new row is in the DOM & measured
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      });
    }
  }, [messages.length, scrollToBottom]);

  const [form, fields] = useForm({
    id: 'send-message-form',
    constraint: getZodConstraint(MessageSchema),
    lastResult: messageFetcher.data,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: MessageSchema });
    },
  });

  const handleStartReply = (message: MessageWithUser) => {
    setReplyingTo(message);
    // Optional: focus the textarea for better UX
    const contentElement = formRef.current?.elements.namedItem(
      'content'
    ) as HTMLElement;
    contentElement?.focus();
  };

  const handleStartEdit = (messageId: string) => {
    setEditingMessageId(messageId);
    setReplyingTo(null); // Can't edit and reply at the same time
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
  };

  const handleBookmarkToggle = React.useCallback(
    (messageId: string) => {
      // Prevent multiple concurrent bookmark operations on the same message
      if (pendingBookmarkRef.current?.messageId === messageId) {
        return;
      }

      const currentMessage = messages.find((msg) => msg.id === messageId);
      if (!currentMessage) return;

      const isCurrentlyBookmarked = currentMessage.bookmarks.length > 0;
      const willBeBookmarked = !isCurrentlyBookmarked;

      // Store the expected state for error recovery
      pendingBookmarkRef.current = {
        messageId,
        expectedState: willBeBookmarked,
      };

      // Optimistic update
      updateBookmark(messageId, user.id, willBeBookmarked);

      // Submit the request
      bookmarkFetcher.submit(
        { intent: 'toggleBookmark', messageId },
        { method: 'POST' }
      );
    },
    [messages, user.id, updateBookmark, bookmarkFetcher]
  );

  //------------------THis moved to use-infinite-messages.tsx hook--------------------------

  // React.useEffect(() => {
  //   setMessages(room.messages);
  //   if (!socket) {
  //     return;
  //   }
  //   socket.emit('joinRoom', room.id);

  //   const handleNewMessage = (newMessage: MessageWithUser) => {
  //     // Check if the message is for the current room to prevent cross-talk
  //     if (newMessage.roomId === room.id) {
  //       setMessages((prevMessages) => {
  //         if (prevMessages.some((msg) => msg.id === newMessage.id)) {
  //           return prevMessages;
  //         }
  //         return [...prevMessages, newMessage];
  //       });
  //     }
  //   };
  //   socket.on('newMessage', handleNewMessage);

  //   const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
  //     setMessages((prevMessages) =>
  //       prevMessages.filter((message) => message.id !== messageId)
  //     );
  //   };
  //   socket.on('messageDeleted', handleMessageDeleted);

  //   const handleMessageEdited = (updatedMessage: {
  //     id: string;
  //     content: string | null;
  //   }) => {
  //     setMessages((prevMessages) =>
  //       prevMessages.map((msg) =>
  //         msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
  //       )
  //     );
  //     // Optional: close the edit form on other clients if they were also editing it
  //     setEditingMessageId((id) => (id === updatedMessage.id ? null : id));
  //   };
  //   socket.on('messageEdited', handleMessageEdited);

  //   return () => {
  //     if (socket) {
  //       socket.emit('leaveRoom', room.id);
  //       socket.off('newMessage', handleNewMessage);
  //       socket.off('messageDeleted', handleMessageDeleted);
  //       socket.off('messageEdited', handleMessageEdited);
  //     }
  //   };
  // }, [room.id, socket]);

  // --- Image Upload Logic ---

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      stagedFileRef.current = file;
      setPreviewUrl(URL.createObjectURL(file));
      textareaRef.current?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Access the clipboard items
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      // We only care about image files
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          event.preventDefault();
          stagedFileRef.current = file;
          setPreviewUrl(URL.createObjectURL(file));
          // Set the file input value so the form can submit it
          if (imageInputRef.current) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            imageInputRef.current.files = dataTransfer.files;
          }
          textareaRef.current?.focus();
          break; // Stop after handling the first image
        }
      }
    }
  };

  const handleToggleUserList = () => {
    const newVisibility = !isUsersListVisible;
    setIsUsersListVisible(newVisibility); // Update UI instantly

    // Tell the server to set the cookie for future visits
    userListFetcher.submit(
      { visible: newVisibility.toString() },
      { method: 'POST', action: '/resources/userlist-toggle' }
    );
  };

  // --- Form Reset Logic ---
  React.useEffect(() => {
    if (
      messageFetcher.state === 'idle' &&
      messageFetcher.data?.status === 'success'
    ) {
      formRef.current?.reset();
      setReplyingTo(null);
      setPreviewUrl(null);
      stagedFileRef.current = null;
    }
  }, [messageFetcher.state, messageFetcher.data, setReplyingTo]);

  // --- Bookmark Update Logic ---
  const pendingBookmarkRef = React.useRef<{
    messageId: string;
    expectedState: boolean;
  } | null>(null);

  React.useEffect(() => {
    if (
      bookmarkFetcher.state === 'idle' &&
      bookmarkFetcher.data?.status === 'success' &&
      (bookmarkFetcher.data as any)?.toggledMessageId
    ) {
      const messageId = (bookmarkFetcher.data as any).toggledMessageId;
      const isNowBookmarked = (bookmarkFetcher.data as any).bookmarked;

      if (typeof isNowBookmarked === 'boolean') {
        updateBookmark(messageId, user.id, isNowBookmarked);
      }

      if (pendingBookmarkRef.current?.messageId === messageId) {
        pendingBookmarkRef.current = null;
      }
    } else if (
      bookmarkFetcher.state === 'idle' &&
      bookmarkFetcher.data &&
      !(
        'status' in bookmarkFetcher.data &&
        bookmarkFetcher.data.status === 'success'
      )
    ) {
      // Handle error case (action threw an error or returned non-success) - revert optimistic update
      if (pendingBookmarkRef.current) {
        const { messageId, expectedState } = pendingBookmarkRef.current;
        updateBookmark(messageId, user.id, !expectedState); // Revert to opposite
        pendingBookmarkRef.current = null;
      }
    }
  }, [bookmarkFetcher.state, bookmarkFetcher.data, user.id, updateBookmark]);

  const handleFormSubmit = () => {
    const hasText = textareaRef.current?.value.trim() !== '';
    // stagedFileRef is the source of truth for the file data that will be submitted
    const hasImage = !!stagedFileRef.current;
    if (!hasText && !hasImage) {
      toast.error('A message must have content or an image.');
      return; // Stop submission
    }

    if (formRef.current) {
      // Using requestSubmit to programmatically submit the form,
      // which respects the form's native behavior and integrations.
      formRef.current.requestSubmit();
    }
  };

  const isDm = room.name.startsWith('dm:');
  let headerTitle: string;
  let headerIcon: React.ReactNode;

  if (isDm) {
    // Find the other user in the DM
    const dmPartner = room.members.find((member) => member.id !== user.id);
    headerTitle = dmPartner?.name ?? 'Direct Message';
    // Use the other user's avatar for the icon
    headerIcon = (
      <Avatar className="h-7 w-7">
        <AvatarImage
          src={
            dmPartner?.image ? getUserImagePath(dmPartner.image.id) : undefined
          }
        />
        <AvatarFallback>{headerTitle[0].toUpperCase()}</AvatarFallback>
      </Avatar>
    );
  } else {
    // For regular rooms, use the existing logic
    headerTitle = room.name;
    headerIcon = <RoomIcon iconName={room.icon} />;
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 bg-card overflow-hidden">
        {/* Header - Fixed at top */}
        <header className="flex-shrink-0 border-b border-border/60 p-4 z-10">
          <div className="flex items-center justify-between">
            <h1
              className="text-lg font-semibold capitalize flex items-center gap-2"
              translate="no"
            >
              {headerIcon}
              <span translate="yes">{headerTitle}</span>
            </h1>
            <div className="flex items-center gap-1.5">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <CalendarIcon className="size-4" />
                        <span className="sr-only">Select a date</span>
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View messages from a specific date</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) =>
                      date > new Date() || date < new Date('2000-01-01')
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <div className="bg-muted-foreground/20 w-px h-5 mx-1.5" />
              <p className="text-sm font-medium text-muted-foreground hidden sm:block">
                {format(selectedDate, 'PPP')}
              </p>
              <div className="bg-muted-foreground/20 w-px h-5 mx-1.5 hidden sm:block" />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleUserList}
                className={
                  isUsersListVisible
                    ? 'text-foreground cursor-pointer'
                    : 'text-muted-foreground hover:text-foreground cursor-pointer'
                }
              >
                <UsersRound className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Messages Area - Scrollable container (takes remaining space) */}
        <div className="flex-1 min-h-0 relative">
          <div
            className="absolute inset-0 overflow-auto"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'hsl(var(--border)) transparent',
            }}
            ref={scrollViewportRef}
          >
            {shouldVirtualize ? (
              // Virtualized implementation for large lists
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualItems.map((virtualRow) => {
                  const isLoaderRow = hasMore && virtualRow.index === 0;

                  return (
                    <div
                      key={
                        isLoaderRow
                          ? 'loader'
                          : messages[
                              hasMore ? virtualRow.index - 1 : virtualRow.index
                            ]?.id
                      }
                      data-index={virtualRow.index}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      ref={rowVirtualizer.measureElement}
                    >
                      {isLoaderRow ? (
                        <div className="flex justify-center py-4">
                          <div className="h-6 w-6 animate-spin rounded-full border-4 border-muted/20 border-t-muted" />
                        </div>
                      ) : (
                        (() => {
                          const messageIndex = hasMore
                            ? virtualRow.index - 1
                            : virtualRow.index;
                          const message = messages[messageIndex];

                          if (!message) return null;

                          const previousMessage = messages[messageIndex - 1];
                          const showDateBadge = shouldShowDateBadge(
                            new Date(message.createdAt),
                            previousMessage
                              ? new Date(previousMessage.createdAt)
                              : null
                          );

                          return (
                            <div className="mx-auto max-w-4xl px-4 py-1">
                              {showDateBadge && (
                                <DateBadge
                                  className="mb-2"
                                  date={new Date(message.createdAt)}
                                />
                              )}
                              <ChatMessage
                                message={message}
                                isCurrentUser={message.user?.id === user.id}
                                currentUser={user}
                                onStartReply={handleStartReply}
                                deleteFetcher={deleteFetcher}
                                editingMessageId={editingMessageId}
                                onStartEdit={handleStartEdit}
                                onCancelEdit={handleCancelEdit}
                                onBookmarkToggle={handleBookmarkToggle}
                              />
                            </div>
                          );
                        })()
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Simple non-virtualized implementation for small lists
              <div className="w-full">
                {hasMore && (
                  <div className="flex justify-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-muted/20 border-t-muted" />
                  </div>
                )}
                {messages.map((message, index) => {
                  const previousMessage = messages[index - 1];
                  const showDateBadge = shouldShowDateBadge(
                    new Date(message.createdAt),
                    previousMessage ? new Date(previousMessage.createdAt) : null
                  );

                  return (
                    <div
                      key={message.id}
                      className="mx-auto max-w-4xl px-4 py-1"
                    >
                      {showDateBadge && (
                        <DateBadge
                          className="mb-2"
                          date={new Date(message.createdAt)}
                        />
                      )}
                      <ChatMessage
                        message={message}
                        isCurrentUser={message.user?.id === user.id}
                        currentUser={user}
                        onStartReply={handleStartReply}
                        deleteFetcher={deleteFetcher}
                        editingMessageId={editingMessageId}
                        onStartEdit={handleStartEdit}
                        onCancelEdit={handleCancelEdit}
                        onBookmarkToggle={handleBookmarkToggle}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <footer className="flex-shrink-0 border-t border-border/60 p-2 sm:p-4 z-10">
          <div className="max-w-4xl mx-auto">
            {replyingTo && (
              <div className="mb-2 flex items-center justify-between rounded-md border bg-muted p-2 text-sm">
                <div className="truncate">
                  <p className="font-semibold text-muted-foreground">
                    Replying to {replyingTo.user?.name}
                  </p>

                  {replyingTo.content && (
                    <p className="truncate text-muted-foreground/80">
                      "{replyingTo.content}"
                    </p>
                  )}

                  {replyingTo.image && (
                    <div className="flex items-center gap-2 text-muted-foreground/80">
                      <ImageIcon className="size-4 shrink-0" />
                      <img
                        src={getChatImagePath(replyingTo.image.id)}
                        alt={replyingTo.image.altText ?? 'Replied image'}
                        className="h-8 w-8 rounded-sm object-cover"
                      />
                      {/* Only show the word "Image" if there's no text to avoid redundancy */}
                      {!replyingTo.content && <span>Image</span>}
                    </div>
                  )}

                  {/* 3. Fallback for deleted messages */}
                  {!replyingTo.content && !replyingTo.image && (
                    <p className="truncate text-muted-foreground/80 italic">
                      Message/Image was deleted
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => setReplyingTo(null)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}
            <messageFetcher.Form
              method="post"
              encType="multipart/form-data"
              {...getFormProps(form)}
              ref={formRef}
              className="relative flex items-center rounded-lg border shadow-sm bg-textarea"
            >
              {replyingTo && (
                <input type="hidden" name="replyToId" value={replyingTo.id} />
              )}

              {/* Image Preview */}
              {previewUrl && (
                <div className="relative mb-2 w-fit">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-24 w-auto rounded-md object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                    onClick={() => {
                      setPreviewUrl(null);
                      stagedFileRef.current = null;
                      if (imageInputRef.current)
                        imageInputRef.current.value = '';
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                type="file"
                name="chatImage"
                ref={imageInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <TextareaAutosize
                ref={textareaRef}
                // Use Conform's getInputProps for accessibility and validation
                {...getInputProps(fields.content, { type: 'text' })}
                className="flex-1 resize-none border-0 bg-transparent py-3 pl-4 pr-20 text-sm placeholder:text-muted-foreground focus:ring-0 focus-visible:outline-none"
                placeholder={`Message #${headerTitle}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // Prevent new line on Enter
                    handleFormSubmit();
                  }
                }}
                onPaste={handlePaste}
                minRows={1}
                maxRows={6}
              />
              <div className="absolute bottom-1.5 right-2 flex items-center gap-1">
                {/* Button to trigger the file input */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground cursor-pointer hover:bg-card/80 transition-colors duration-300"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Paperclip className="size-5" />
                </Button>

                <Button
                  type="button"
                  size="icon"
                  className="size-8 bg-background text-sidebar-accent hover:bg-background/80 cursor-pointer transition-colors duration-300"
                  disabled={messageFetcher.state !== 'idle'}
                  onClick={handleFormSubmit}
                >
                  <SendHorizonalIcon className="size-4 -rotate-90" />
                </Button>
              </div>
            </messageFetcher.Form>
          </div>
        </footer>
      </div>

      {/* Users List Sidebar */}
      <AnimatePresence>
        {isUsersListVisible && (
          <motion.div
            className="bg-sidebar flex-none border-l border-border/50  h-full rounded-r-2xl"
            key="user-list-sidebar"
            initial={{ width: 0 }}
            animate={{ width: '16rem' }}
            exit={{ width: 0 }}
            style={{ overflow: 'hidden' }}
            transition={{
              type: 'spring',
              stiffness: 250,
              damping: 25,
            }}
          >
            {!isReady ? (
              <div className="p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground"></div>
                  Loading members...
                </div>
                <p className="mt-2 text-xs text-muted-foreground/60">
                  If this takes too long, try refreshing the page
                </p>
              </div>
            ) : (
              <UserList
                members={allUsers}
                currentUserId={user.id}
                onlineUserIds={onlineUserIds}
                userStatuses={userStatuses}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
