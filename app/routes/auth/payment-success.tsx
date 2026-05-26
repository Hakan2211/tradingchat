import { redirect, type LoaderFunctionArgs } from 'react-router';
import {
  getSession,
  sessionKey,
  sessionStorage,
  getSessionExpirationDate,
} from '#/utils/session.server';
import { invariantResponse } from '#/utils/misc';
import { prisma } from '#/utils/db.server';
import { createFreshSession } from '#/utils/auth.server';
import { stripe } from '#/utils/stripe.server';

// A helper function to introduce a small delay for polling
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * This loader acts as a programmatic gatekeeper after successful payment.
 * It verifies the Stripe checkout session, waits for the webhook to create the
 * user + subscription in our DB, creates a login session, and redirects to the
 * app. The user only exists once the webhook has run, so we resolve them via
 * the Stripe checkout session id rather than a userId.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const checkoutSessionId = url.searchParams.get('session_id');

  invariantResponse(checkoutSessionId, 'Checkout session id is missing.');

  // 1. Confirm the checkout with Stripe and get the subscription id.
  const checkoutSession = await stripe.checkout.sessions.retrieve(
    checkoutSessionId
  );

  invariantResponse(
    checkoutSession.payment_status === 'paid' ||
      checkoutSession.status === 'complete',
    'Payment has not been completed.'
  );

  const stripeSubscriptionId = checkoutSession.subscription as string | null;
  invariantResponse(
    stripeSubscriptionId,
    'No subscription found on this checkout session.'
  );

  // 2. Poll our DB until the webhook has created the user + subscription.
  let subscription: { userId: string } | null = null;
  for (let i = 0; i < 15; i++) {
    subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
      select: { userId: true },
    });

    console.log(
      `Polling attempt ${i + 1}/15:`,
      subscription ? 'Subscription confirmed!' : 'Not confirmed yet'
    );

    if (subscription) break;
    await sleep(1000); // Wait 1 second before trying again
  }

  // 3. If after polling there's still no subscription, something went wrong.
  invariantResponse(
    subscription,
    'Subscription could not be confirmed. Please contact support.',
    { status: 500 }
  );

  // 4. SUCCESS! Create a fresh login session for the newly created user.
  const { id: sessionId } = await createFreshSession(subscription.userId);

  const session = await getSession();
  session.set(sessionKey, sessionId);

  const sessionCookie = await sessionStorage.commitSession(session, {
    expires: getSessionExpirationDate(),
  });

  // 5. Redirect the user to the app, with the session cookie set. They are now logged in.
  return redirect('/home', {
    headers: { 'Set-Cookie': sessionCookie },
  });
}

// This component is the "waiting room" UI shown while the loader is polling.
export default function PaymentSuccess() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-dashed border-primary"></div>
      <h1 className="text-xl font-semibold">Finalizing Your Account...</h1>
      <p className="text-muted-foreground">
        Please wait a moment while we confirm your subscription.
      </p>
    </div>
  );
}
