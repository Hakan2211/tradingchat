import { useLoaderData, type LoaderFunctionArgs } from 'react-router';
import { prisma } from '#/utils/db.server';
import { requireUserId } from '#/utils/auth.server';
import { BookmarkIcon, ArrowLeft } from 'lucide-react';
import {
  BookmarkedMessageCard,
  BookmarkDateHeader,
} from '#/components/bookmark/bookmarked-message-card';
import { RedirectBackButton } from '#/components/navigationTracker/redirect-back-button';

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
          roomId: true,
          image: {
            select: { id: true, altText: true },
          },
          user: {
            select: { id: true, name: true, image: { select: { id: true } } },
          },
        },
      },
    },
  });

  // Group bookmarks by date
  const groupedBookmarks = bookmarks.reduce((groups, bookmark) => {
    const date = new Date(bookmark.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(bookmark);
    return groups;
  }, {} as Record<string, typeof bookmarks>);

  return { bookmarks, groupedBookmarks };
}

export default function BookmarksPage() {
  const { bookmarks, groupedBookmarks } = useLoaderData<typeof loader>();

  return (
    <div className="flex h-full flex-col bg-card overflow-hidden">
      <header className="flex-shrink-0 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RedirectBackButton
              variant="ghost"
              size="icon"
              className="size-8"
              fallback="/home"
            >
              <ArrowLeft className="size-4" />
            </RedirectBackButton>
            <h1 className="text-lg">My Bookmarks</h1>
          </div>
          <span className="text-sm text-muted-foreground">
            {bookmarks.length}{' '}
            {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
          </span>
        </div>
      </header>
      <div className="flex-1 min-h-0 relative">
        <div
          className="absolute inset-0 overflow-auto"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--border)) transparent',
          }}
        >
          <div className="mx-auto max-w-4xl px-4 py-6">
            {bookmarks.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedBookmarks).map(
                  ([date, dayBookmarks]) => (
                    <div key={date}>
                      <BookmarkDateHeader date={date} />
                      <div className="space-y-2">
                        {dayBookmarks.map((bookmark) => (
                          <BookmarkedMessageCard
                            key={bookmark.id}
                            bookmark={bookmark}
                          />
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <BookmarkIcon className="size-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  No bookmarks yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Start bookmarking messages to see them here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
