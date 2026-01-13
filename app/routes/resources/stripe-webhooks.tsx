// routes/resources/stripe-webhooks.tsx
import { type ActionFunctionArgs } from 'react-router';
import { stripe } from '#/utils/stripe.server';
import { prisma } from '#/utils/db.server';
import type Stripe from 'stripe';

// This function ensures all Stripe statuses are mapped to your DB enum
const toDbStatus = (status: Stripe.Subscription.Status): any => {
  if (status === 'unpaid') return 'unpaid';
  return status;
};

export async function action({ request }: ActionFunctionArgs) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return new Response('Configuration error.', { status: 400 });
  }

  try {
    const payload = await request.text();
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.userId;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (!userId || !subscriptionId || !customerId) {
          throw new Error(
            'Webhook Error: checkout.session.completed missing required data.'
          );
        }

        const subscription = (await stripe.subscriptions.retrieve(
          subscriptionId
        )) as Stripe.Subscription;

        // In newer Stripe API versions (2025+), period dates are on the subscription item
        const subscriptionItem = subscription.items.data[0];
        const periodStart = subscriptionItem.current_period_start;
        const periodEnd = subscriptionItem.current_period_end;

        await prisma.subscription.create({
          data: {
            userId: userId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: customerId,
            status: toDbStatus(subscription.status),
            tierId: subscriptionItem.price.product as string,
            priceId: subscriptionItem.price.id,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodStart: new Date(periodStart * 1000),
            currentPeriodEnd: new Date(periodEnd * 1000),
            startedAt: new Date(subscription.created * 1000),
          },
        });
        console.log(`✅ Subscription CREATED for user ${userId}`);
        break;
      }
      // Add these cases to handle subscription updates from the Customer Portal
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // In newer Stripe API versions (2025+), period dates are on the subscription item
        const subscriptionItem = subscription.items.data[0];
        const periodEnd = subscriptionItem.current_period_end;

        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: toDbStatus(subscription.status),
            priceId: subscriptionItem.price.id,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodEnd: new Date(periodEnd * 1000),
          },
        });
        console.log(`✅ Subscription UPDATED/DELETED: ${subscription.id}`);
        break;
      }
    }

    return new Response(null, { status: 200 });
  } catch (err: any) {
    console.error(`Stripe Webhook Error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
}
