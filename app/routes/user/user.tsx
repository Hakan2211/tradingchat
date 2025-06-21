import { Outlet, useLoaderData, type LoaderFunctionArgs } from 'react-router';
import { z } from 'zod';
import { prisma } from '#/utils/db.server';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
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
    },
  });

  invariantResponse(user, 'User not found', { status: 404 });
  return { user };
}

export default function User() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
          <CardHeader>
            <CardTitle>{user.name}'s Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <Outlet />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
