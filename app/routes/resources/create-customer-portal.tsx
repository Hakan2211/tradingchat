import { redirect, type LoaderFunctionArgs } from 'react-router';
import { requireUser } from '#/utils/auth.server';
import { invariantResponse } from '#/utils/misc';
import { polar } from '#/utils/polar.server';
import { prisma } from '#/utils/db.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await prisma.user.findUnique({
    where: { id: await requireUser(request).then((u) => u.id) },
    select: { email: true },
  });

  invariantResponse(user, 'User not found', { status: 404 });

  // Create a portal session for the customer's email
  const portalSession = await polar.customerSessions.create({
    customerId: user.email, // Use email as customer identifier
  });

  // Redirect them to the portal
  return redirect(portalSession.customerPortalUrl);
}
