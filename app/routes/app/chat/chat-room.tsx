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
import { io } from 'socket.io-client';
import { format } from 'date-fns';
import type { Server } from 'socket.io';
import { prisma } from '#/utils/db.server';
import { requireUserId } from '#/utils/auth.server';
import { invariantResponse, getUserImagePath } from '#/utils/misc';
import { Button } from '#/components/ui/button';
import { ScrollArea } from '#/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import TextareaAutosize from 'react-textarea-autosize';
import {
  SendHorizonalIcon,
  type LucideIcon,
  Hash,
  MessageCircleMore,
  Eye,
  CircleHelp,
} from 'lucide-react';
import { ChatMessage } from '#/components/chat/chat-message';

type MessageWithUser = {
  id: string;
  content: string;
  createdAt: Date;
  roomId: string;
  user: {
    id: string;
    name: string | null;
    image: { id: string } | null;
  };
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
});

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { roomId } = params;
  invariantResponse(roomId, 'Room ID is required', { status: 404 });

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
          user: {
            select: { id: true, name: true, image: { select: { id: true } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  invariantResponse(room, 'Room not found', { status: 404 });

  return { room, userId };
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { roomId } = params;
  invariantResponse(roomId, 'Cannot submit message without a room ID');

  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: MessageSchema });

  if (submission.status !== 'success') {
    return submission.reply();
  }
  const newMessage = await prisma.message.create({
    data: {
      content: submission.value.content,
      roomId,
      userId,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      roomId: true,
      user: {
        select: { id: true, name: true, image: { select: { id: true } } },
      },
    },
  });

  const { io } = context as { io: Server };
  io.to(roomId).emit('newMessage', newMessage);

  return submission.reply();
}

// 2. THE REFURBISHED CHAT ROOM COMPONENT
export default function ChatRoom() {
  const { room, userId } = useLoaderData<typeof loader>();
  const [messages, setMessages] = React.useState<MessageWithUser[]>(
    room.messages
  );
  const messageFetcher = useFetcher<typeof action>();
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

  // --- Socket and State Sync Logic (no changes needed) ---
  React.useEffect(() => {
    setMessages(room.messages);
    const socket = io();
    socket.emit('joinRoom', room.id);

    const handleNewMessage = (newMessage: MessageWithUser) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    };
    socket.on('newMessage', handleNewMessage);

    return () => {
      socket.emit('leaveRoom', room.id);
      socket.off('newMessage', handleNewMessage);
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
    }
  }, [messageFetcher.state, messageFetcher.data]);

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
              isCurrentUser={message.user.id === userId}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Footer with TextareaAutosize */}
      <footer className="flex-none border-t bg-background/80 p-4 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl">
          <messageFetcher.Form
            method="post"
            {...getFormProps(form)}
            ref={formRef}
            className="relative rounded-xl border border-border bg-background shadow-sm"
          >
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

// --- MessageBubble Component (no changes needed) ---
function MessageBubble({ message }: { message: MessageWithUser }) {
  const userInitial = message.user.name
    ? message.user.name.charAt(0).toUpperCase()
    : '?';
  return (
    <div className="flex items-start gap-3">
      <Avatar className="size-8">
        <AvatarImage
          src={
            message.user.image?.id
              ? getUserImagePath(message.user.image.id)
              : undefined
          }
        />
        <AvatarFallback>{userInitial}</AvatarFallback>
      </Avatar>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-semibold">{message.user.name}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(message.createdAt), 'p')}
          </p>
        </div>
        <p className="text-sm">{message.content}</p>
      </div>
    </div>
  );
}
