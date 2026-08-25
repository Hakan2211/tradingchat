import type { LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import type { NewsCatalyst } from '@prisma/client';
import { NewsPage } from '#/components/news/news-page';
import {
  getNewsPage,
  getNewsSources,
  getNewsThemes,
  getUserNewsWatches,
  requireNewsAccess,
  type NewsFilters,
} from '#/utils/news.server';
import { DEFAULT_ALERT_THRESHOLD } from '#/utils/news/constants';

/**
 * The `/news` feed.
 *
 * Filters live in the URL (like journal and chat) so a view is shareable and
 * the back button works. The loader is also the pagination endpoint: the client
 * re-requests it with `?cursor=` for the next page, which is why it returns the
 * bare page shape when a cursor is present.
 */
function filtersFrom(url: URL): NewsFilters {
  const minScoreRaw = Number(url.searchParams.get('minScore'));
  return {
    ticker: url.searchParams.get('ticker')?.trim() || undefined,
    catalysts: url.searchParams.getAll('catalyst') as NewsCatalyst[],
    feedKeys: url.searchParams.getAll('source'),
    minScore: Number.isFinite(minScoreRaw) && minScoreRaw > 0 ? minScoreRaw : undefined,
    // Default ON. `anyTicker=1` opts out.
    withTickerOnly: url.searchParams.get('anyTicker') !== '1',
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { userId, isStaff } = await requireNewsAccess(request);

  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor');
  const filters = filtersFrom(url);

  const page = await getNewsPage(filters, cursor);

  // A cursored request is the infinite-scroll fetch; it needs only the page.
  if (cursor) return page;

  return {
    ...page,
    sources: await getNewsSources(),
    alertThreshold: DEFAULT_ALERT_THRESHOLD,
    // Also loaded by the app layout, which is what actually fires the alerts.
    // Fetched again here so the manager dialog has them without reaching into
    // the parent route's data by id.
    watches: await getUserNewsWatches(userId),
    // Send-to-Scanner / Add-to-Theme. Staff only: /news is open to every active
    // subscriber, but the scanner and themes are one shared curated set and
    // their resource routes already require admin or moderator. Gating here
    // only avoids showing a button that would 403.
    canCurate: isStaff,
    themes: isStaff ? await getNewsThemes() : [],
  };
}

export default function NewsIndexRoute() {
  const data = useLoaderData<typeof loader>();

  return (
    <NewsPage
      initialItems={data.items}
      initialCursor={data.nextCursor}
      sources={'sources' in data ? data.sources : []}
      alertThreshold={
        'alertThreshold' in data ? data.alertThreshold : DEFAULT_ALERT_THRESHOLD
      }
      watches={'watches' in data ? data.watches : []}
      canCurate={'canCurate' in data ? data.canCurate : false}
      themes={'themes' in data ? data.themes : []}
    />
  );
}
