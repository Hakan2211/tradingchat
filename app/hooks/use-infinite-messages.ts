import * as React from 'react';
import { useFetcher, useParams } from 'react-router';
import type { loader } from '#/routes/app/chat/chat-room';

type LoaderData = Awaited<ReturnType<typeof loader>>;
type MessagesLoaderData = Pick<LoaderData, 'messages' | 'hasMore'>;

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

export function useInfiniteMessages(initialData: MessagesLoaderData) {
  const { roomId } = useParams();
  const fetcher = useFetcher<MessagesLoaderData>();

  // Convert any message type to MessageWithUser type
  const normalizeMessage = React.useCallback((msg: any): MessageWithUser => {
    return {
      id: msg.id,
      content: msg.content,
      createdAt: msg.createdAt,
      roomId: msg.roomId,
      isDeleted: msg.isDeleted,
      bookmarks: msg.bookmarks || [],
      image: msg.image || null,
      user: msg.user
        ? {
            id: msg.user.id,
            name: msg.user.name,
            image: msg.user.image,
            username: msg.user.username,
          }
        : null,
      replyTo: msg.replyTo || null,
    };
  }, []);

  const [messages, setMessages] = React.useState<MessageWithUser[]>(
    (initialData.messages || []).map(normalizeMessage)
  );
  const [hasMore, setHasMore] = React.useState(initialData.hasMore ?? false);
  const isLoading = fetcher.state === 'loading';

  const messagesRef = React.useRef(messages);
  messagesRef.current = messages;

  // Reset state when roomId changes or initialData changes
  React.useEffect(() => {
    const normalizedMessages = (initialData.messages || []).map(
      normalizeMessage
    );
    setMessages(normalizedMessages);
    setHasMore(initialData.hasMore ?? false);
  }, [roomId, initialData.messages, initialData.hasMore, normalizeMessage]);

  const loadMore = React.useCallback(() => {
    if (isLoading || !hasMore) return;
    const oldestMessageId = messagesRef.current[0]?.id;
    if (oldestMessageId) {
      fetcher.load(`/chat/${roomId}?cursor=${oldestMessageId}`);
    }
  }, [isLoading, hasMore, roomId, fetcher]);

  React.useEffect(() => {
    if (fetcher.data?.messages) {
      const normalizedMessages = fetcher.data.messages.map(normalizeMessage);
      setMessages((prev) => [...normalizedMessages, ...prev]);
      setHasMore(fetcher.data.hasMore);
    }
  }, [fetcher.data, normalizeMessage]);

  // Surgical update functions for sockets
  const addMessage = React.useCallback((newMessage: MessageWithUser) => {
    setMessages((prev) => {
      if (prev.some((msg) => msg.id === newMessage.id)) return prev;
      return [...prev, newMessage];
    });
  }, []);

  const deleteMessage = React.useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  const editMessage = React.useCallback(
    (updatedMessage: { id: string; content: string | null }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
        )
      );
    },
    []
  );

  return {
    messages,
    setMessages,
    hasMore,
    isLoading,
    loadMore,
    addMessage,
    deleteMessage,
    editMessage,
  };
}
