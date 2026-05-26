import { redirect, type LoaderFunctionArgs } from 'react-router';
import { requireAnonymous } from '#/utils/auth.server';
import { getDomainUrl, invariantResponse } from '#/utils/misc';
import { stripe } from '#/utils/stripe.server';
import { prisma } from '#/utils/db.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAnonymous(request);

  const url = new URL(request.url);
  const registrationId = url.searchParams.get('registrationId');

  invariantResponse(registrationId, 'registrationId is required');

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { id: true, email: true, priceId: true, expiresAt: true },
  });

  // Missing or expired pending registration → send them back to start over.
  if (!registration || registration.expiresAt.getTime() < Date.now()) {
    return redirect('/register');
  }

  const domainUrl = getDomainUrl(request);
  // Use the Stripe-provided checkout session id so payment-success can resolve
  // the (webhook-created) user without needing a userId up front.
  const successUrl = `${domainUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${domainUrl}/register`;

  // 4. Create a Stripe Checkout session
  console.log('Creating Stripe checkout session with:', {
    priceId: registration.priceId,
    successUrl: successUrl,
    customerEmail: registration.email,
  });

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: registration.priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: registration.email,
    client_reference_id: registration.id,
    metadata: {
      registrationId: registration.id,
    },
  });

  console.log('Created Stripe checkout session:', {
    id: checkoutSession.id,
    url: checkoutSession.url,
    successUrl: checkoutSession.success_url,
  });

  invariantResponse(
    checkoutSession.url,
    'Could not create a checkout session.'
  );

  // 5. Redirect the user to Stripe's checkout page
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
