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
  Paperclip,
  ImageIcon,
  UsersRound,
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

const MAX_CHAT_IMAGE_SIZE = 5 * 1024 * 1024; // 10MB

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
    .max(1000, 'Message cannot be more than 1000 characters')
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
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: { name: 'asc' },
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
          image: {
            select: { id: true, altText: true },
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
              image: { select: { id: true, altText: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  invariantResponse(room, 'Room not found', { status: 404 });

  const userListVisibility = await getUserListVisibility(request);

  return { room, user, allUsers, userListVisibility };
}

//----------------------Action Function-------------------------------------------------------------------------------
export async function action({ request, params, context }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { roomId } = params;
  invariantResponse(roomId, 'Cannot submit message without a room ID');

  const formData = await parseFormData(request, {
    maxFileSize: MAX_CHAT_IMAGE_SIZE,
  });

  // Check for an uploaded image
  const imageFile = formData.get('chatImage') as FileUpload | string | null;
  let newImageRecord = null;

  if (imageFile && typeof imageFile !== 'string' && imageFile.size > 0) {
    // 1. Process with Sharp (you already have this)
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const { data: optimizedBuffer, contentType } = await processImage(
      imageBuffer
    );

    // 2. Upload to R2
    const { objectKey } = await uploadImageToR2(
      optimizedBuffer,
      contentType,
      userId
    );

    // 3. Create the image record in Prisma
    newImageRecord = await prisma.chatImage.create({
      data: {
        contentType,
        objectKey,
        altText: imageFile.name,
      },
    });
  }

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
      const [updatedMessage] = await Promise.all([
        prisma.$transaction(async (tx) => {
          // First, delete the ChatImage record if it exists
          if (message.image) {
            await tx.chatImage.delete({
              where: { id: message.image.id },
            });
          }

          // Then update the message
          return tx.message.update({
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
            },
          });
        }),
        objectKeyToDelete
          ? deleteImageFromR2(objectKeyToDelete)
          : Promise.resolve(),
      ]);
      io.to(roomId).emit('messageEdited', updatedMessage);
    } else {
      // --- HARD DELETE PATH ---
      // Here we delete the message and the R2 object.
      await Promise.all([
        prisma.message.delete({ where: { id: messageId } }),
        objectKeyToDelete
          ? deleteImageFromR2(objectKeyToDelete)
          : Promise.resolve(),
      ]);
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

  invariantResponse(
    submission.value.content || newImageRecord,
    'A message must have content or an image.'
  );

  const newMessage = await prisma.message.create({
    data: {
      content: submission.value.content || undefined,
      roomId,
      userId,
      replyToId: submission.value.replyToId,
      imageId: newImageRecord?.id,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      roomId: true,
      isDeleted: true,
      image: { select: { id: true, altText: true } },
      user: {
        select: { id: true, name: true, image: { select: { id: true } } },
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

  const { io } = context as { io: Server };
  io.to(roomId).emit('newMessage', messageToBroadcast);

  return submission.reply();
}

//----------------------Component Function UI----------------------------------------------------------------------

export default function ChatRoom() {
  const { room, user, allUsers, userListVisibility } =
    useLoaderData<typeof loader>();
  const [messages, setMessages] = React.useState<MessageWithUser[]>(
    room.messages
  );
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(
    null
  );
  const [replyingTo, setReplyingTo] = React.useState<MessageWithUser | null>(
    null
  );
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isUsersListVisible, setIsUsersListVisible] =
    React.useState(userListVisibility);
  const userListFetcher = useFetcher<typeof action>();

  const messageFetcher = useFetcher<typeof action>();
  const deleteFetcher = useFetcher<typeof action>();
  const bookmarkFetcher = useFetcher<typeof action>();
  const formRef = React.useRef<HTMLFormElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const stagedFileRef = React.useRef<File | null>(null);
  // Ref for the scroll area's viewport
  const scrollViewportRef = React.useRef<HTMLDivElement>(null);

  const userListWidth = '16rem';
  const animationTransition = {
    type: 'spring' as const,
    stiffness: 150,
    damping: 20,
  };

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
      content: string | null;
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
      setPreviewUrl(null);
      stagedFileRef.current = null;
    }
  }, [messageFetcher.state, messageFetcher.data, setReplyingTo]);

  return (
    <motion.div
      className="flex h-[calc(100vh-4rem)] relative overflow-x-hidden"
      animate={{ paddingRight: isUsersListVisible ? userListWidth : '0rem' }}
      transition={animationTransition}
    >
      {/* Main Chat Area */}
      <div className="flex flex-grow flex-col">
        {/* Header */}
        <header className="flex-none border-b p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold capitalize flex items-center gap-2">
              <RoomIcon iconName={room.icon} />
              {room.name}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleUserList}
              className={
                isUsersListVisible
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }
            >
              <UsersRound className="size-4" />
            </Button>
          </div>
        </header>

        {/* Messages Area using ScrollArea */}
        <ScrollArea className="flex-1" ref={scrollViewportRef}>
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
            {messages.map((message, index) => {
              const currentMessageDate = new Date(message.createdAt);
              const previousMessageDate =
                index > 0 ? new Date(messages[index - 1].createdAt) : null;

              const showDateBadge = shouldShowDateBadge(
                currentMessageDate,
                previousMessageDate
              );

              return (
                <React.Fragment key={message.id}>
                  {showDateBadge && <DateBadge date={currentMessageDate} />}
                  <ChatMessage
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
                </React.Fragment>
              );
            })}
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
                      [message deleted]
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
              className="relative rounded-xl border border-border bg-background shadow-sm"
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
                className="w-full resize-none border-0 bg-transparent p-3 pr-16 text-sm placeholder:text-muted-foreground focus:ring-0 focus-visible:outline-none"
                placeholder={`Message #${room.name}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    const hasText = e.currentTarget.value.trim() !== '';
                    const hasImage = !!previewUrl || !!stagedFileRef.current;
                    if ((hasText || hasImage) && formRef.current) {
                      e.preventDefault();
                      formRef.current.requestSubmit();
                    }
                  }
                }}
                onPaste={handlePaste}
                minRows={1}
                maxRows={6}
              />
              <div className="absolute bottom-2 right-12">
                {/* Button to trigger the file input */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Paperclip className="size-4" />
                </Button>
              </div>
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

      {/* Users List Sidebar */}
      <AnimatePresence>
        {isUsersListVisible && (
          <motion.div
            className="w-48 border-l bg-muted/30 lg:w-64 absolute top-0 right-0 h-full"
            style={{ width: userListWidth }}
            key="user-list-sidebar"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'spring',
              stiffness: 150,
              damping: 20,
            }}
          >
            <UserList members={allUsers} currentUserId={user.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
