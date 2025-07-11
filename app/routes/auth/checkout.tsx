import { redirect, type LoaderFunctionArgs } from 'react-router';
import { requireUser } from '#/utils/auth.server';
import { getDomainUrl, invariantResponse } from '#/utils/misc';
import { polar } from '#/utils/polar.server';
import { prisma } from '#/utils/db.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await prisma.user.findUnique({
    where: { id: await requireUser(request).then((u) => u.id) },
    select: { id: true, email: true },
  });

  invariantResponse(user, 'User not found', { status: 404 });

  const url = new URL(request.url);
  const tierId = url.searchParams.get('tierId');
  invariantResponse(tierId, 'tierId is required');

  const domainUrl = getDomainUrl(request);
  const successUrl = `${domainUrl}/home?new_subscription=true`;
  const cancelUrl = `${domainUrl}/pricing`;

  // 4. Create a Polar Checkout session
  const checkoutSession = await polar.checkouts.create({
    products: [tierId],
    successUrl: successUrl,
    customerEmail: user.email,
    metadata: {
      // IMPORTANT: This links the Polar subscription back to our user
      userId: user.id,
    },
  });

  invariantResponse(
    checkoutSession.url,
    'Could not create a checkout session.'
  );

  // 5. Redirect the user to Polar's checkout page
  return redirect(checkoutSession.url);
}

// This page doesn't render anything, it just redirects.
// You could render a "Redirecting to payment..." message if you wanted.
export default function CheckoutPage() {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <h1 className="text-xl font-semibold">
        Redirecting to secure payment...
      </h1>
      <p className="text-muted-foreground">
        Please wait while we prepare your checkout session.
      </p>
    </div>
  );
}
