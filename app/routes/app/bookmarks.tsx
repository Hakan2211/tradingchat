import {
  useLoaderData,
  type LoaderFunctionArgs,
  useFetcher,
} from 'react-router';
import { prisma } from '#/utils/db.server';
import { requireUserId } from '#/utils/auth.server';
import { ChatMessage } from '#/components/chat/chat-message';
import { useState } from 'react';
import { BookmarkedMessageCard } from '#/components/bookmark/bookmarked-message-card';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      message: {
        select: {
          id: true,
          content: true,
          roomId: true, // <-- Make sure this is selected
          user: {
            select: { id: true, name: true, image: { select: { id: true } } },
          },
        },
      },
    },
  });

  return { bookmarks };
}

export default function BookmarksPage() {
  const { bookmarks } = useLoaderData<typeof loader>();

  return (
    <div className="flex h-full flex-col">
      <header className="flex-none border-b p-4">
        <h1 className="text-xl font-bold">My Bookmarks</h1>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          {bookmarks.length > 0 ? (
            // No need to pass any fetchers down. The card handles itself.
            bookmarks.map((bookmark) => (
              <BookmarkedMessageCard key={bookmark.id} bookmark={bookmark} />
            ))
          ) : (
            <p className="text-center text-muted-foreground">
              You haven't bookmarked any messages yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
