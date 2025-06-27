import * as React from 'react';
import {
  useLoaderData,
  useFetcher,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from 'react-router';
import { z } from 'zod';
import { getFormProps, getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { io as socketIo } from 'socket.io-client';

import type { Server } from 'socket.io';
import { prisma } from '#/utils/db.server';
import { requireUserId } from '#/utils/auth.server';
import { invariantResponse } from '#/utils/misc';
import { Button } from '#/components/ui/button';
import { ScrollArea } from '#/components/ui/scroll-area';
import TextareaAutosize from 'react-textarea-autosize';
import {
  SendHorizonalIcon,
  type LucideIcon,
  Hash,
  MessageCircleMore,
  Eye,
  CircleHelp,
  X,
} from 'lucide-react';
import { ChatMessage } from '#/components/chat/chat-message';
import { requirePermission } from '#/utils/permission.server';

type MessageWithUser = {
  id: string;
  content: string;
  createdAt: Date;
  roomId: string;
  isDeleted: boolean;
  bookmarks: {
    id: string;
    userId: string;
    messageId: string;
  }[];
  user: {
    id: string;
    name: string | null;
    image: { id: string } | null;
  } | null;
  replyTo: {
    content: string;
    user: { name: string | null } | null;
    createdAt: Date;
  } | null;
};

const iconMap: Record<string, LucideIcon> = {
  MessageCircleMore,
  Eye,
  CircleHelp,
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

const MessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(1000),
  replyToId: z.string().optional(),
});

const EditMessageSchema = z.object({
  messageId: z.string(),
  content: z.string().min(1, 'Message cannot be empty').max(1000),
});

//----------------------Loader Function-------------------------------------------------------------------------------
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { roomId } = params;
  invariantResponse(roomId, 'Room ID is required', { status: 404 });

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

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      name: true,
      icon: true,
      messages: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          roomId: true,
          isDeleted: true,
          bookmarks: {
            where: {
              userId: userId,
            },
            select: {
              id: true,
              userId: true,
              messageId: true,
            },
          },
          user: {
            select: { id: true, name: true, image: { select: { id: true } } },
          },
          replyTo: {
            select: {
              content: true,
              user: {
                select: { name: true },
              },
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  invariantResponse(room, 'Room not found', { status: 404 });

  return { room, user };
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { roomId } = params;
  invariantResponse(roomId, 'Cannot submit message without a room ID');

  const formData = await request.formData();
  const intent = formData.get('intent');

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

    // 2. THE CONDITIONAL LOGIC
    if (hasReplies) {
      // --- SOFT DELETE PATH ---
      const updatedMessage = await prisma.message.update({
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
          user: {
            select: { id: true, name: true, image: { select: { id: true } } },
          },
        },
      });
      // Broadcast an "edit" because the message still exists, but its content changed.
      io.to(roomId).emit('messageEdited', updatedMessage);
    } else {
      // --- HARD DELETE PATH ---
      await prisma.message.delete({ where: { id: messageId } });
      // Broadcast a "delete" because the message is truly gone.
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

    const existingBookmark = await prisma.bookmark.findUnique({
      where: { userId_messageId: { userId, messageId } },
      select: { id: true },
    });

    if (existingBookmark) {
      await prisma.bookmark.delete({ where: { id: existingBookmark.id } });
    } else {
      await prisma.bookmark.create({
        data: {
          userId,
          messageId,
        },
      });
    }
    // Note: No socket broadcast is needed as this is a private user action.
    return { status: 'success' as const, toggledMessageId: messageId };
  }

  const submission = parseWithZod(formData, { schema: MessageSchema });

  if (submission.status !== 'success') {
    return submission.reply();
  }
  const newMessage = await prisma.message.create({
    data: {
      content: submission.value.content,
      roomId,
      userId,
      replyToId: submission.value.replyToId,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      roomId: true,
      isDeleted: true,
      user: {
        select: { id: true, name: true, image: { select: { id: true } } },
      },
      replyTo: {
        select: {
          content: true,
          user: { select: { name: true } },
          createdAt: true,
        },
      },
      bookmarks: true,
    },
  });

  const { io } = context as { io: Server };
  io.to(roomId).emit('newMessage', newMessage);

  return submission.reply();
}

export default function ChatRoom() {
  const { room, user } = useLoaderData<typeof loader>();
  const [messages, setMessages] = React.useState<MessageWithUser[]>(
    room.messages
  );
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(
    null
  );

  const [replyingTo, setReplyingTo] = React.useState<MessageWithUser | null>(
    null
  );

  const messageFetcher = useFetcher<typeof action>();
  const deleteFetcher = useFetcher<typeof action>();
  const bookmarkFetcher = useFetcher<typeof action>();
  const formRef = React.useRef<HTMLFormElement>(null);

  // Ref for the scroll area's viewport
  const scrollViewportRef = React.useRef<HTMLDivElement>(null);

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

  React.useEffect(() => {
    setMessages(room.messages);
    const socket = socketIo();
    socket.emit('joinRoom', room.id);

    const handleNewMessage = (newMessage: MessageWithUser) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    };
    socket.on('newMessage', handleNewMessage);

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prevMessages) =>
        prevMessages.filter((message) => message.id !== messageId)
      );
    };
    socket.on('messageDeleted', handleMessageDeleted);

    const handleMessageEdited = (updatedMessage: {
      id: string;
      content: string;
    }) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === updatedMessage.id
            ? { ...msg, content: updatedMessage.content }
            : msg
        )
      );
      // Optional: close the edit form on other clients if they were also editing it
      setEditingMessageId((id) => (id === updatedMessage.id ? null : id));
    };
    socket.on('messageEdited', handleMessageEdited);

    return () => {
      socket.emit('leaveRoom', room.id);
      socket.off('newMessage', handleNewMessage);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('messageEdited', handleMessageEdited);
      socket.disconnect();
    };
  }, [room.id, room.messages]);

  // --- Auto-scroll Logic for the new ScrollArea ---
  React.useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // --- Form Reset Logic ---
  React.useEffect(() => {
    if (
      messageFetcher.state === 'idle' &&
      messageFetcher.data?.status === 'success'
    ) {
      formRef.current?.reset();
      setReplyingTo(null);
    }
  }, [messageFetcher.state, messageFetcher.data, formRef, setReplyingTo]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <header className="flex-none border-b p-4">
        <h1 className="text-xl font-bold capitalize flex items-center gap-2">
          <RoomIcon iconName={room.icon} />
          {room.name}
        </h1>
      </header>

      {/* Messages Area using ScrollArea */}
      <ScrollArea className="flex-1" ref={scrollViewportRef}>
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isCurrentUser={message.user?.id === user.id}
              currentUser={user}
              onStartReply={handleStartReply}
              deleteFetcher={deleteFetcher}
              editingMessageId={editingMessageId}
              onStartEdit={handleStartEdit}
              onCancelEdit={handleCancelEdit}
              bookmarkFetcher={bookmarkFetcher}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Footer with TextareaAutosize */}
      <footer className="flex-none border-t bg-background/80 p-4 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl">
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between rounded-md border bg-muted p-2 text-sm">
              <div className="truncate">
                <p className="font-semibold text-muted-foreground">
                  Replying to {replyingTo.user?.name}
                </p>
                <p className="truncate text-muted-foreground/80">
                  "{replyingTo.content}"
                </p>
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
            {...getFormProps(form)}
            ref={formRef}
            className="relative rounded-xl border border-border bg-background shadow-sm"
          >
            {replyingTo && (
              <input type="hidden" name="replyToId" value={replyingTo.id} />
            )}
            <TextareaAutosize
              // Use Conform's getInputProps for accessibility and validation
              {...getInputProps(fields.content, { type: 'text' })}
              className="w-full resize-none border-0 bg-transparent p-3 pr-16 text-sm placeholder:text-muted-foreground focus:ring-0 focus-visible:outline-none"
              placeholder={`Message #${room.name}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  formRef.current?.requestSubmit(); // Programmatic submit
                }
              }}
              minRows={1}
              maxRows={6}
            />
            <div className="absolute bottom-2 right-2">
              <Button
                type="submit"
                size="icon"
                className="size-8"
                disabled={messageFetcher.state !== 'idle'}
              >
                <SendHorizonalIcon className="size-4 -rotate-90" />
              </Button>
            </div>
          </messageFetcher.Form>
        </div>
      </footer>
    </div>
  );
}
