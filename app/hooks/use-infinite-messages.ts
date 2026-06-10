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

  // --- Gap recovery ---------------------------------------------------------
  // Reconcile with the server after we may have missed live socket updates
  // (disconnect/reconnect, server redeploy, tab/laptop sleep, a "zombie"
  // socket). Re-joining the room only resumes FUTURE messages; anything sent
  // while we were away is never replayed over the socket. This fetches the
  // latest page and MERGES in whatever we don't already have, so it backfills
  // the gap without resetting scroll or dropping already-loaded history.
  const syncFetcher = useFetcher<MessagesLoaderData>();
  const syncFetcherRef = React.useRef(syncFetcher);
  syncFetcherRef.current = syncFetcher;

  const syncLatest = React.useCallback(() => {
    // One reconciliation in flight is enough.
    if (syncFetcherRef.current.state !== 'idle') return;
    syncFetcherRef.current.load(`/chat/${roomId}`);
  }, [roomId]);

  React.useEffect(() => {
    if (!syncFetcher.data?.messages) return;
    const fetched = syncFetcher.data.messages.map(normalizeMessage);
    setMessages((prev) => {
      const existing = new Set(prev.map((m) => m.id));
      const missing = fetched.filter((m) => !existing.has(m.id));
      if (missing.length === 0) return prev;
      const merged = [...prev, ...missing];
      merged.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return merged;
    });
  }, [syncFetcher.data, normalizeMessage]);

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

  const updateBookmark = React.useCallback(
    (messageId: string, userId: string, isBookmarked: boolean) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            return {
              ...msg,
              bookmarks: isBookmarked
                ? [{ id: 'temp', userId, messageId }]
                : [],
            };
          }
          return msg;
        })
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
    syncLatest,
    addMessage,
    deleteMessage,
    editMessage,
    updateBookmark,
  };
}
