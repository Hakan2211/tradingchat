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

// A helper function to introduce a small delay for polling
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * This loader acts as a programmatic gatekeeper after successful payment.
 * It verifies the checkout, waits for the webhook to confirm the subscription
 * in our DB, creates a session, and redirects to the app.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  console.log('Payment success loader called with:', {
    userId,
    fullUrl: request.url,
  });

  invariantResponse(userId, 'User ID is missing.');

  // 1. Verify the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  invariantResponse(user, 'User specified in URL not found.');

  console.log('User found:', user.email);

  // 2. Poll our database to confirm the webhook has been processed
  let subscription = null;
  console.log('Starting to poll for subscription for userId:', userId);

  for (let i = 0; i < 15; i++) {
    // Poll up to 15 times (approx 15 seconds)

    // First, let's check if there are any subscriptions for this user at all
    const allUserSubscriptions = await prisma.subscription.findMany({
      where: {
        userId: String(userId),
      },
    });

    console.log(`All subscriptions for user ${userId}:`, allUserSubscriptions);

    subscription = await prisma.subscription.findFirst({
      where: {
        userId: String(userId),
        status: 'active',
      },
    });

    console.log(
      `Polling attempt ${i + 1}/15:`,
      subscription ? 'Found active subscription!' : 'No active subscription yet'
    );

    if (subscription) {
      break; // Found it! Exit the loop.
    }
    await sleep(1000); // Wait 1 second before trying again
  }

  // 3. If after polling, we still have no active subscription, something went wrong.
  // Send them to the pricing page with an error.
  invariantResponse(
    subscription,
    'Subscription could not be confirmed. Please contact support.',
    { status: 500 }
  );

  // 4. SUCCESS! The subscription is confirmed. Create a fresh session for the user.
  const { id: sessionId } = await createFreshSession(String(userId));

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
