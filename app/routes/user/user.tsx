import { Outlet, useLoaderData, type LoaderFunctionArgs } from 'react-router';
import { prisma } from '#/utils/db.server';
import { GeneralErrorBoundary } from '#/components/errorBoundary/errorBoundary';
import { invariantResponse } from '#/utils/misc';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const userId = params.id;
  invariantResponse(userId, 'User ID is required in the URL');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      bio: true,
      createdAt: true,
      image: { select: { id: true, updatedAt: true } },
      subscription: {
        select: {
          id: true,
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          stripeCustomerId: true,
          polarCustomerId: true,
          stripeSubscriptionId: true,
          polarSubscriptionId: true,
        },
      },
    },
  });

  invariantResponse(user, 'User not found', { status: 404 });
  return { user };
}

export default function User() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col h-full w-full bg-card overflow-hidden">
      <Outlet />
    </div>
  );
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
