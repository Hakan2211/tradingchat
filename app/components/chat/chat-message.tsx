import { cn } from '#/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { getUserImagePath } from '#/utils/misc';
import { MessageActions } from './message-actions';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover';
import { EllipsisVertical, Reply, ImageIcon } from 'lucide-react';
import { userHasPermission } from '#/utils/userPermissionRole';
import { useFetcher } from 'react-router';
import { z } from 'zod';
import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { Button } from '../ui/button';
import TextareaAutosize from 'react-textarea-autosize';
import * as React from 'react';
import { getChatImagePath } from '#/utils/misc';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog';
import { DeletedMessage } from './deleted-message';
import { HydratedDate } from './dateBadge';

//replyblock UI
function QuotedMessage({
  message,
}: {
  message: {
    content: string | null;
    user: { name: string | null } | null;
    createdAt: Date;
    image: {
      id: string;
      altText: string | null;
    } | null;
  };
}) {
  return (
    <div className="mb-1 rounded-lg border-l-4 border-muted-foreground/50 bg-muted/50 p-2 text-sm">
      <div className="flex-1 space-y-1 truncate">
        <div className="flex items-center gap-3">
          <p className="font-semibold">
            {message.user?.name || 'Unknown User'}
          </p>

          <HydratedDate
            date={new Date(message.createdAt)}
            formatStr="HH:mm"
            className="text-xs text-muted-foreground"
            fallback="--:--"
          />
        </div>
        {message.content && (
          <p className="truncate text-muted-foreground">{message.content}</p>
        )}

        {message.image && !message.content && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <ImageIcon className="size-4 shrink-0" />
            <span>Image</span>
          </div>
        )}
      </div>

      {message.image && (
        <img
          src={getChatImagePath(message.image.id)}
          alt={message.image.altText ?? 'Replied image'}
          className="h-10 w-10 shrink-0 rounded-sm object-cover"
        />
      )}
    </div>
  );
}

type ChatMessageProps = {
  message: {
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
  isCurrentUser: boolean;
  currentUser: {
    id: string;
    roles: {
      name: string;
      permissions: {
        action: string;
        entity: string;
        access: string;
      }[];
    }[];
  };
  onStartReply: (message: ChatMessageProps['message']) => void;
  deleteFetcher: ReturnType<typeof useFetcher>;
  editingMessageId: string | null;
  onStartEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  bookmarkFetcher: ReturnType<typeof useFetcher>;
  onBookmarkToggle?: (messageId: string) => void;
};

const EditMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  messageId: z.string(),
  intent: z.literal('editMessage'),
});

function EditMessageForm({
  message,
  onCancel,
}: {
  message: ChatMessageProps['message'];
  onCancel: () => void;
}) {
  const editFetcher = useFetcher();
  const [form, fields] = useForm({
    id: `edit-form-${message.id}`,
    constraint: getZodConstraint(EditMessageSchema),
    defaultValue: {
      content: message.content || '',
      messageId: message.id,
      intent: 'editMessage' as const,
    },
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: EditMessageSchema });
    },
  });

  React.useEffect(() => {
    if (
      editFetcher.state === 'idle' &&
      editFetcher.data?.status === 'success'
    ) {
      onCancel();
    }
  }, [editFetcher.state, editFetcher.data, onCancel]);

  return (
    <editFetcher.Form
      method="POST"
      {...getFormProps(form)}
      className="flex-1 space-y-2"
    >
      <input {...getInputProps(fields.intent, { type: 'hidden' })} />
      <input {...getInputProps(fields.messageId, { type: 'hidden' })} />
      <TextareaAutosize
        {...getInputProps(fields.content, { type: 'text' })}
        className="w-full resize-none rounded-md border bg-background text-primary p-2 text-sm"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
      />
      <div className="flex items-center gap-2 text-xs">
        <Button
          className="cursor-pointer"
          type="submit"
          size="sm"
          disabled={editFetcher.state !== 'idle'}
        >
          Save
        </Button>
        <Button
          className="cursor-pointer"
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </editFetcher.Form>
  );
}

export function ChatMessage({
  message,
  isCurrentUser,
  currentUser,
  onStartReply,
  deleteFetcher,
  editingMessageId,
  onStartEdit,
  onCancelEdit,
  bookmarkFetcher,
  onBookmarkToggle,
}: ChatMessageProps) {
  const userInitial = message.user?.name
    ? message.user.name.charAt(0).toUpperCase()
    : '?';

  const canEditAny = userHasPermission(currentUser, 'update:message:any');
  const canEditOwn = userHasPermission(currentUser, 'update:message:own');
  const canDeleteAny = userHasPermission(currentUser, 'delete:message:any');
  const canDeleteOwn = userHasPermission(currentUser, 'delete:message:own');
  const isOwner = message.user?.id === currentUser.id;

  const showEditButton = canEditAny || (canEditOwn && isOwner);
  const showDeleteButton = canDeleteAny || (canDeleteOwn && isOwner);

  const isEditing = editingMessageId === message.id;

  // Use the actual bookmark state from the message
  // The parent component now handles optimistic updates properly
  const isBookmarked = message.bookmarks.length > 0;

  if (message.isDeleted) {
    return <DeletedMessage />;
  }

  return (
    <div className="group flex flex-col gap-1 py-2">
      <div className="flex items-start gap-3">
        <Avatar className="size-9 shrink-0 aspect-square rounded-lg">
          <AvatarImage
            src={
              message.user?.image?.id
                ? getUserImagePath(message.user.image.id)
                : undefined
            }
          />
          <AvatarFallback className="aspect-square rounded-lg bg-emerald-700 text-primary-foreground">
            {userInitial}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{message.user?.name}</p>
            <HydratedDate
              date={new Date(message.createdAt)}
              formatStr="HH:mm"
              className="text-xs text-muted-foreground"
              fallback="--:--"
            />
          </div>
          {message.user?.username && (
            <p className="text-xs text-muted-foreground">
              @
              {message.user?.username.charAt(0).toUpperCase() +
                message.user?.username.slice(1)}
            </p>
          )}
        </div>

        <div className="pl-11">
          {isEditing ? (
            <EditMessageForm message={message} onCancel={onCancelEdit} />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex flex-col relative items-start">
                {message.replyTo && (
                  <QuotedMessage message={{ ...message.replyTo }} />
                )}

                {message.replyTo && (
                  <div className="absolute right-2 top-[50%] -translate-y-1/2">
                    <Reply size={16} className="text-muted-foreground/80" />
                  </div>
                )}

                {message.content && (
                  <div
                    className={cn(
                      'max-w-md rounded-xl px-3.5 py-2.5 tracking-[0.015em]',
                      message.replyTo ? '-mt-1' : '',
                      isCurrentUser
                        ? 'bg-primary text-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                )}

                {/* Render the image if it exists */}
                {message.image?.id && (
                  <Dialog>
                    <DialogTitle className="sr-only">
                      {message.image.altText ?? 'Chat image'}
                    </DialogTitle>
                    <DialogTrigger asChild>
                      <img
                        src={getChatImagePath(message.image.id)}
                        alt={message.image.altText ?? 'Chat image'}
                        className="max-w-xs cursor-pointer rounded-lg object-cover transition hover:opacity-90"
                      />
                    </DialogTrigger>
                    <DialogContent className="p-0 border-0 max-w-4xl max-h-[90vh]">
                      <img
                        src={getChatImagePath(message.image.id)}
                        alt={message.image.altText ?? 'Chat image'}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </DialogContent>
                    <DialogDescription className="sr-only">
                      {message.image.altText ?? 'Chat image'}
                    </DialogDescription>
                  </Dialog>
                )}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground">
                    <EllipsisVertical size={16} />
                    <span className="sr-only">Message options</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  className="border-none bg-transparent p-0 shadow-none"
                >
                  <MessageActions
                    onReply={() => onStartReply(message)}
                    canDelete={showDeleteButton}
                    onDelete={() => {
                      deleteFetcher.submit(
                        { intent: 'deleteMessage', messageId: message.id },
                        { method: 'POST' }
                      );
                    }}
                    canEdit={showEditButton}
                    onEdit={() => onStartEdit(message.id)}
                    isBookmarked={isBookmarked}
                    onBookmarkToggle={() => {
                      if (onBookmarkToggle) {
                        onBookmarkToggle(message.id);
                      } else {
                        // Fallback to old behavior if no handler provided
                        bookmarkFetcher.submit(
                          { intent: 'toggleBookmark', messageId: message.id },
                          { method: 'POST' }
                        );
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
