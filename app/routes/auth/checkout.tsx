import { redirect, type LoaderFunctionArgs } from 'react-router';
import { requireAnonymous } from '#/utils/auth.server';
import { getDomainUrl, invariantResponse } from '#/utils/misc';
import { stripe } from '#/utils/stripe.server';
import { prisma } from '#/utils/db.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAnonymous(request);

  const url = new URL(request.url);
  const priceId = url.searchParams.get('priceId'); // Change from tierId to priceId for Stripe
  const email = url.searchParams.get('email');

  invariantResponse(priceId, 'priceId is required');
  invariantResponse(email, 'email is required');

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  invariantResponse(user, 'User not found', { status: 404 });

  const domainUrl = getDomainUrl(request);
  const successUrl = `${domainUrl}/payment-success?userId=${user.id}`;
  const cancelUrl = `${domainUrl}/register`;

  // 4. Create a Stripe Checkout session
  console.log('Creating Stripe checkout session with:', {
    priceId: priceId,
    successUrl: successUrl,
    customerEmail: user.email,
  });

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: {
      userId: user.id,
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
