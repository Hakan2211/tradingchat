// app/routes/app/themes/themes-index.tsx
import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { requireUserId } from '#/utils/auth.server';
import { prisma } from '#/utils/db.server';
import { ThemesPage } from '#/components/themes/themes-page';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  // Get user with roles to check permissions on client
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      roles: { select: { name: true } },
    },
  });

  const canEdit = user.roles.some(
    (r) => r.name === 'admin' || r.name === 'moderator'
  );

  // Fetch all themes with their tickers and counts
  const themes = await prisma.theme.findMany({
    orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { tickers: true } },
      tickers: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: {
          addedBy: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
    },
  });

  return { themes, canEdit };
}

export default function ThemesIndexPage() {
  const { themes, canEdit } = useLoaderData<typeof loader>();

  return <ThemesPage themes={themes} canEdit={canEdit} />;
}
