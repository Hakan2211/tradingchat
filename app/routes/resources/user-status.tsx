import { type ActionFunctionArgs } from 'react-router';
import { z } from 'zod';
import { parseWithZod } from '@conform-to/zod';
import { requireUserId } from '#/utils/auth.server';
import { prisma } from '#/utils/db.server';
import type { Server } from 'socket.io';

// Schema to validate the incoming status from the form
const StatusFormSchema = z.object({
  status: z.enum(['ONLINE', 'AWAY', 'DO_NOT_DISTURB']),
});

export async function action({ request, context }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: StatusFormSchema });

  if (submission.status !== 'success') {
    return new Response(JSON.stringify({ error: 'Invalid status' }), {
      status: 400,
    });
  }

  const { status } = submission.value;

  // Update the user's status in the database
  await prisma.user.update({
    where: { id: userId },
    data: { status },
  });

  // Broadcast the status change to all clients
  const { io } = context as { io: Server };
  io.emit('user.status.changed', { userId, status });

  return { status: 'ok', ok: true };
}
