// app/routes/app/scanner/scanner-index.tsx
import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { requireUserId } from '#/utils/auth.server';
import { prisma } from '#/utils/db.server';
import { ScannerPage } from '#/components/scanner/scanner-page';

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

  // Fetch all scanner entries with creator info
  const entries = await prisma.scannerEntry.findMany({
    orderBy: { targetDate: 'desc' },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          username: true,
          image: { select: { id: true } },
        },
      },
    },
  });

  // Get dates that have entries (for calendar dot indicators)
  const datesWithEntries = [
    ...new Set(
      entries.map((e) => {
        const d = new Date(e.targetDate);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })
    ),
  ];

  return { entries, datesWithEntries, canEdit };
}

export default function ScannerIndexPage() {
  const { entries, datesWithEntries, canEdit } =
    useLoaderData<typeof loader>();

  return (
    <ScannerPage
      entries={entries}
      datesWithEntries={datesWithEntries}
      canEdit={canEdit}
    />
  );
}
