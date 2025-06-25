import { Link, useLoaderData, type LoaderFunctionArgs } from 'react-router';
import { prisma } from '#/utils/db.server';
import { requireUserId } from '#/utils/auth.server';

// This loader fetches data specific to the home page (the list of all users)
export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request);
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
  });
  return { users };
}

export default function Home() {
  const { users } = useLoaderData<typeof loader>();

  // This content will be rendered by the <Outlet /> in app-layout.tsx
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
      </div>

      {/* Your content here */}
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        {users.map((user) => (
          <Link key={user.id} to={`/user/${user.id}`}>
            <div className="bg-muted/50 hover:bg-muted aspect-video rounded-xl flex items-center justify-center text-lg font-medium">
              {user.name}
            </div>
          </Link>
        ))}
      </div>
      <div className="bg-muted/50 min-h-[60vh] flex-1 rounded-xl p-4">
        {/* You can add more dashboard components here */}
        <p>Your main dashboard content can go here.</p>
      </div>
    </div>
  );
}
