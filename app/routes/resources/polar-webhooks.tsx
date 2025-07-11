import type { ActionFunctionArgs } from 'react-router';
import {
  validateEvent,
  WebhookVerificationError,
} from '@polar-sh/sdk/webhooks';
import { prisma } from '#/utils/db.server';
import type { Subscription, SubscriptionStatus } from '@prisma/client';

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.text();

  if (!process.env.POLAR_WEBHOOK_SECRET) {
    console.error('POLAR_WEBHOOK_SECRET is not configured.');
    return new Response('Webhook secret missing', { status: 400 });
  }

  try {
    // Convert Headers to plain object
    const headersObj: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    // 1. Verify the event comes from Polar using the SDK
    const event = validateEvent(
      body,
      headersObj,
      process.env.POLAR_WEBHOOK_SECRET
    );

    // 2. Handle the event
    switch (event.type) {
      case 'subscription.created':
      case 'subscription.updated': {
        const subscriptionData = event.data;
        const userId = subscriptionData.customer?.metadata?.userId;

        if (!userId) {
          console.error('Webhook Error: userId not found in metadata');
          break; // Acknowledge the webhook but don't process it
        }

        const dataToUpsert: Omit<
          Subscription,
          'id' | 'createdAt' | 'updatedAt' | 'userId'
        > & { userId: string } = {
          userId: String(userId),
          polarSubscriptionId: subscriptionData.id,
          status: subscriptionData.status as SubscriptionStatus,
          tierId:
            subscriptionData.productId || subscriptionData.product?.id || '',
          priceId: subscriptionData.prices?.[0]?.id || '',
          cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || false,
          currentPeriodStart: subscriptionData.currentPeriodStart
            ? new Date(subscriptionData.currentPeriodStart)
            : new Date(),
          currentPeriodEnd: subscriptionData.currentPeriodEnd
            ? new Date(subscriptionData.currentPeriodEnd)
            : new Date(),
          startedAt: subscriptionData.startedAt
            ? new Date(subscriptionData.startedAt)
            : new Date(),
          endedAt: subscriptionData.endedAt
            ? new Date(subscriptionData.endedAt)
            : null,
        };

        await prisma.subscription.upsert({
          where: { polarSubscriptionId: subscriptionData.id },
          create: dataToUpsert,
          update: dataToUpsert,
        });

        // Optional: You could assign a 'subscribed' role here
        // await prisma.user.update({
        //   where: { id: String(userId) },
        //   data: { roles: { connect: { name: 'subscribed' } } }
        // });

        console.log(`Subscription processed for user: ${userId}`);
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 3. Acknowledge the event
  return new Response(null, { status: 200 });
}
