// routes/resources/create-customer-portal.tsx
import { redirect, type LoaderFunctionArgs } from 'react-router';
import { requireUser } from '#/utils/auth.server';
import { invariantResponse, getDomainUrl } from '#/utils/misc';
import { stripe } from '#/utils/stripe.server';
import { polar } from '#/utils/polar.server'; // We need both now!
import { prisma } from '#/utils/db.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = (await requireUser(request)).id;

  // Fetch BOTH Stripe and Polar IDs for the user
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      stripeCustomerId: true,
      polarCustomerId: true,
    },
  });

  // If they have a Stripe ID, send them to the Stripe Portal
  if (subscription?.stripeCustomerId) {
    const domainUrl = getDomainUrl(request);
    // Return to the user's profile page
    const returnUrl = `${domainUrl}/user/${userId}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return redirect(portalSession.url);
  }

  // If they have a Polar ID, send them to the Polar Portal
  if (subscription?.polarCustomerId) {
    const portalSession = await polar.customerSessions.create({
      customerId: subscription.polarCustomerId,
    });

    return redirect(portalSession.customerPortalUrl);
  }

  // If they have neither, something is wrong
  invariantResponse(false, 'Could not find a valid customer subscription.', {
    status: 404,
  });
}
