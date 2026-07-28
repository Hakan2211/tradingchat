import * as React from 'react';
import { useFetcher, useParams, useSearchParams } from 'react-router';
import type { loader } from '#/routes/app/chat/chat-room';
import { tradingDay } from '#/utils/trading-time';

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
  const [searchParams] = useSearchParams();
  // The loader scopes messages to a single day, defaulting to today. Every
  // fetch this hook issues must carry the day being viewed, or it silently
  // answers with today's messages while the user is reading an older date.
  const dateParam = searchParams.get('date') ?? '';
  const buildMessagesUrl = React.useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams();
      if (dateParam) params.set('date', dateParam);
      if (cursor) params.set('cursor', cursor);
      const query = params.toString();
      return `/chat/${roomId}${query ? `?${query}` : ''}`;
    },
    [roomId, dateParam]
  );
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

  // --- Cross-view leak guard -------------------------------------------------
  // Every /chat/:roomId renders the SAME component instance, so this hook — and
  // both of its fetchers — survive a room switch or a date change. A fetcher
  // response can therefore land while a different view is on screen, either
  // because it was still in flight when the user navigated, or because React
  // Router revalidates a fetcher's last URL after any action (e.g. sending a
  // message in the new room re-runs the old room's load). Merging that response
  // blindly pastes another view's messages into the one being read — a DM
  // showing up in Main, or today's messages showing up under an older date. We
  // tag each fetch with the view it was issued for and drop any result that
  // doesn't belong to the view currently on screen.
  const viewKey = `${roomId ?? ''}|${dateParam}`;
  const pageViewKeyRef = React.useRef<string | null>(viewKey);
  const syncViewKeyRef = React.useRef<string | null>(viewKey);
  const lastViewKeyRef = React.useRef(viewKey);

  // Reset state when the view (room or date) changes, or initialData changes
  React.useEffect(() => {
    // Declared before the merge effects below, so a fetch issued for the view
    // we just left is disowned before its result can be applied here. Only on a
    // real view change — a same-view revalidation must not cancel an in-flight
    // page of history.
    if (lastViewKeyRef.current !== viewKey) {
      lastViewKeyRef.current = viewKey;
      pageViewKeyRef.current = null;
      syncViewKeyRef.current = null;
    }
    const normalizedMessages = (initialData.messages || []).map(
      normalizeMessage
    );
    setMessages(normalizedMessages);
    setHasMore(initialData.hasMore ?? false);
  }, [viewKey, initialData.messages, initialData.hasMore, normalizeMessage]);

  const loadMore = React.useCallback(() => {
    if (isLoading || !hasMore) return;
    const oldestMessageId = messagesRef.current[0]?.id;
    if (oldestMessageId) {
      pageViewKeyRef.current = viewKey;
      fetcher.load(buildMessagesUrl(oldestMessageId));
    }
  }, [isLoading, hasMore, viewKey, buildMessagesUrl, fetcher]);

  React.useEffect(() => {
    if (!fetcher.data?.messages) return;
    if (pageViewKeyRef.current !== viewKey) return; // page belongs to another view
    const normalizedMessages = fetcher.data.messages
      .map(normalizeMessage)
      .filter((m) => m.roomId === roomId);
    setMessages((prev) => {
      const existing = new Set(prev.map((m) => m.id));
      const fresh = normalizedMessages.filter((m) => !existing.has(m.id));
      return fresh.length > 0 ? [...fresh, ...prev] : prev;
    });
    setHasMore(fetcher.data.hasMore);
  }, [fetcher.data, normalizeMessage, roomId, viewKey]);

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
    syncViewKeyRef.current = viewKey;
    syncFetcherRef.current.load(buildMessagesUrl());
  }, [viewKey, buildMessagesUrl]);

  React.useEffect(() => {
    if (!syncFetcher.data?.messages) return;
    if (syncViewKeyRef.current !== viewKey) return; // sync belongs to another view
    const fetched = syncFetcher.data.messages
      .map(normalizeMessage)
      .filter((m) => m.roomId === roomId);
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
  }, [syncFetcher.data, normalizeMessage, roomId, viewKey]);

  // Surgical update functions for sockets
  const addMessage = React.useCallback(
    (newMessage: MessageWithUser) => {
      // Last line of defence: a socket event for another room (e.g. a room we
      // haven't been removed from yet after navigating away) must never render
      // here.
      if (newMessage.roomId !== roomId) return;
      // While the user is reading a specific past day, live messages belong to
      // a different day's view — appending them would show today's chat under
      // that date. The day is resolved in New York time, the same way the
      // loader picked the range now on screen. Only filter when a date was
      // explicitly chosen: the default view tracks the live day, and should
      // keep receiving messages even as the trading day rolls over at ET
      // midnight rather than appearing to freeze.
      if (dateParam && tradingDay(newMessage.createdAt) !== dateParam) return;
      setMessages((prev) => {
        if (prev.some((msg) => msg.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    },
    [roomId, dateParam]
  );

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
