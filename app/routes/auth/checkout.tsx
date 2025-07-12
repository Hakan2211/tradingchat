import { redirect, type LoaderFunctionArgs } from 'react-router';
import { requireAnonymous } from '#/utils/auth.server';
import { getDomainUrl, invariantResponse } from '#/utils/misc';
import { polar } from '#/utils/polar.server';
import { prisma } from '#/utils/db.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAnonymous(request);

  const url = new URL(request.url);
  const tierId = url.searchParams.get('tierId');
  const email = url.searchParams.get('email');

  invariantResponse(tierId, 'tierId is required');
  invariantResponse(email, 'email is required');

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  invariantResponse(user, 'User not found', { status: 404 });

  const domainUrl = getDomainUrl(request);
  const successUrl = `${domainUrl}/payment-success?userId=${user.id}`;

  // 4. Create a Polar Checkout session
  console.log('Creating checkout session with:', {
    products: [tierId],
    successUrl: successUrl,
    customerEmail: user.email,
  });

  const checkoutSession = await polar.checkouts.create({
    products: [tierId],
    successUrl: successUrl,
    customerEmail: user.email,
    requireBillingAddress: false,
    metadata: {
      userId: user.id,
    },
  });

  console.log('Created checkout session:', {
    id: checkoutSession.id,
    url: checkoutSession.url,
    successUrl: checkoutSession.successUrl,
  });

  invariantResponse(
    checkoutSession.url,
    'Could not create a checkout session.'
  );

  // 5. Redirect the user to Polar's checkout page
  return redirect(checkoutSession.url);
}

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
