import { type ActionFunctionArgs, redirect } from 'react-router';
import { z } from 'zod';
import { parseWithZod } from '@conform-to/zod';
import { requireUserId } from '#/utils/auth.server';
import { prisma } from '#/utils/db.server';
import { invariantResponse } from '#/utils/misc';

const CreateDmSchema = z.object({
  targetUserId: z.string(),
});

export async function action({ request }: ActionFunctionArgs) {
  const currentUserId = await requireUserId(request);
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: CreateDmSchema });

  invariantResponse(submission.status === 'success', 'Invalid form data');
  const { targetUserId } = submission.value;

  const participants = [currentUserId, targetUserId].sort();
  const dmRoomName = `dm:${participants[0]}:${participants[1]}`;

  const room = await prisma.room.upsert({
    where: {
      name: dmRoomName,
    },

    create: {
      name: dmRoomName,
      members: {
        connect: [{ id: currentUserId }, { id: targetUserId }],
      },
    },

    update: {},
    select: { id: true },
  });

  await prisma.hiddenRoom.deleteMany({
    where: {
      roomId: room.id,
      userId: currentUserId,
    },
  });

  return redirect(`/chat/${room.id}`);
}
