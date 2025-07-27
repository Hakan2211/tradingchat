import {
  Link,
  useLocation,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';
import { useLoaderData } from 'react-router';
import { prisma } from '#/utils/db.server';
import { requireUserId } from '#/utils/auth.server';
import { invariantResponse } from '#/utils/misc';
import {
  TradeDetailView,
  TradeDetailViewSkeleton,
} from '#/components/journal/tradeDetailView';
import { BookOpen, ArrowLeft, BarChart3 } from 'lucide-react';
import { redirectWithToast } from '#/utils/toaster.server';
import { Button } from '#/components/ui/button';

// --------------------------------------------------------------------------------------------
// --------------------------------------------Loader--------------------------------------------
// --------------------------------------------------------------------------------------------
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tradeId } = params;
  invariantResponse(tradeId, 'Trade ID is required.', { status: 404 });

  const trade = await prisma.tradeEntry.findFirst({
    where: {
      id: tradeId,
      userId: userId,
    },
    include: {
      images: {
        orderBy: {
          imageOrder: 'asc',
        },
      },
    },
  });

  if (!trade) {
    throw new Response('Not Found', { status: 404 });
  }
  return { trade };
}

// --------------------------------------------------------------------------------------------
// --------------------------------Action--------------------------------------------
// --------------------------------------------------------------------------------------------
export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { tradeId } = params;
  invariantResponse(tradeId, 'Trade ID is required.', { status: 404 });

  const formData = await request.formData();
  const intent = formData.get('_intent');

  if (intent === 'delete') {
    const trade = await prisma.tradeEntry.findFirst({
      where: { id: tradeId, userId },
      select: { id: true },
    });

    if (!trade) {
      throw new Response('Not Found', { status: 404 });
    }

    await prisma.tradeEntry.delete({ where: { id: tradeId } });

    const toast = {
      title: 'Deleted',
      description: 'The journal entry has been successfully deleted.',
      type: 'success' as const,
    };
    return redirectWithToast('/journal', toast);
  }

  return { error: 'Invalid intent' };
}

export default function TradeDetailPage() {
  const { trade } = useLoaderData<typeof loader>();
  const location = useLocation();
  const previousViewSearch = location.state?.previousSearch || '';

  return (
    <div className="min-h-full bg-card">
      {/* Premium Navigation Header */}
      <div className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Back Button */}
              <Button
                variant="outline"
                asChild
                className="border-2 bg-transparent transition-colors duration-200"
              >
                <Link
                  to={`/journal?${previousViewSearch}`}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="font-semibold">Back to Gallery</span>
                </Link>
              </Button>

              {/* Page Title */}
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-muted-foreground/10">
                  <BarChart3 className="h-6 w-6 text-muted-foreground/80" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Trade Analysis</h1>
                  <p className="text-sm text-muted-foreground font-medium">
                    Detailed review and performance analysis
                  </p>
                </div>
              </div>
            </div>

            {/* Trade Identifier */}
            {/* <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-muted border">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono text-foreground">
                ID: {trade.id.slice(0, 8)}...
              </span>
            </div> */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <TradeDetailView trade={trade} />
    </div>
  );
}

export function HydrateFallback() {
  return (
    <div className="min-h-full bg-card">
      {/* Skeleton Header */}
      <div className="border-b bg-card/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <div className="flex items-center gap-6">
            <div className="w-32 h-10 bg-muted rounded-lg animate-pulse"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-xl animate-pulse"></div>
              <div className="space-y-2">
                <div className="w-48 h-6 bg-muted rounded animate-pulse"></div>
                <div className="w-64 h-4 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <TradeDetailViewSkeleton />
    </div>
  );
}
