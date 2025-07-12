import { redirect, type LoaderFunctionArgs } from 'react-router';
import { requireUser } from '#/utils/auth.server';
import { invariantResponse } from '#/utils/misc';
import { polar } from '#/utils/polar.server';
import { prisma } from '#/utils/db.server';

export async function loader({ request }: LoaderFunctionArgs) {
  // const userId = await prisma.user.findUnique({
  //   where: { id: await requireUser(request).then((u) => u.id) },
  //   select: { email: true },
  // });
  const userId = (await requireUser(request)).id;

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { polarCustomerId: true },
  });

  invariantResponse(userId, 'User not found', { status: 404 });
  invariantResponse(
    subscription?.polarCustomerId,
    'Could not find a valid customer subscription.',
    { status: 404 }
  );

  const portalSession = await polar.customerSessions.create({
    customerId: subscription.polarCustomerId,
  });

  invariantResponse(
    portalSession.customerPortalUrl,
    'Could not create a customer portal session.',
    { status: 500 }
  );

  // Redirect them to the portal
  return redirect(portalSession.customerPortalUrl);
}
