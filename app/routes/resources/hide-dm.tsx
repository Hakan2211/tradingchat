import { type ActionFunctionArgs, redirect } from 'react-router';
import { z } from 'zod';
import { parseWithZod } from '@conform-to/zod';
import { requireUserId } from '#/utils/auth.server';
import { prisma } from '#/utils/db.server';
import { invariantResponse } from '#/utils/misc';

const HideDmSchema = z.object({
  roomId: z.string(),
});

export async function action({ request, context }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: HideDmSchema });

  invariantResponse(submission.status === 'success', 'Invalid form data');
  const { roomId } = submission.value;

  // Create an entry to mark this room as hidden for this user.
  // We use upsert to safely handle cases where the user might click delete multiple times.
  await prisma.hiddenRoom.upsert({
    where: { userId_roomId: { userId, roomId } },
    update: {},
    create: {
      userId,
      roomId,
    },
  });

  // Emit the dm.hidden event to update the sidebar immediately
  const { io } = context as { io: any };
  io.to(`user:${userId}`).emit('dm.hidden', roomId);

  const mainRoom = await prisma.room.findUnique({
    where: { name: 'Main' },
    select: { id: true },
  });

  if (mainRoom?.id === roomId) {
    return redirect(`/chat/${mainRoom.id}`);
  }

  // Redirect to the home page after hiding a chat is a safe default.
  return redirect(`/chat/${mainRoom?.id}`);
}
