import { type ActionFunctionArgs, data } from 'react-router';
import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';
import { requireUserId } from '#/utils/auth.server';
import { markAlertsRead } from '#/utils/news/alerts.server';

/**
 * Marking fired alerts read.
 *
 * Only the read state is writable here. An alert is CREATED by the server when
 * a rule matches (see `alerts.server.ts`) — there is deliberately no endpoint
 * for a client to declare that one fired, because the whole point of moving
 * matching to the server was that a browser is not the authority on it.
 *
 * No access gate beyond being signed in: every query is scoped by `userId`, so
 * a lapsed member can at most mark their own history read. Blocking that would
 * only strand their own unread badge.
 */

const MarkReadSchema = z.object({
  intent: z.literal('markRead'),
  /** Omitted marks the whole backlog read. */
  alertId: z.string().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: MarkReadSchema });
  if (submission.status !== 'success') {
    return data({ error: 'Invalid request' }, { status: 400 });
  }

  const marked = await markAlertsRead(userId, submission.value.alertId);
  return data({ success: true, marked });
}
