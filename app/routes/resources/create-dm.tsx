import { type ActionFunctionArgs, redirect } from 'react-router';
import { z } from 'zod';
import { parseWithZod } from '@conform-to/zod';
import { requireUserId } from '#/utils/auth.server';
import { prisma } from '#/utils/db.server';
import { invariantResponse } from '#/utils/misc';
import type { Server } from 'socket.io';

const CreateDmSchema = z.object({
  targetUserId: z.string(),
});

export async function action({ request, context }: ActionFunctionArgs) {
  const currentUserId = await requireUserId(request);
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: CreateDmSchema });

  invariantResponse(submission.status === 'success', 'Invalid form data');
  const { targetUserId } = submission.value;

  const participants = [currentUserId, targetUserId].sort();
  const dmRoomName = `dm:${participants[0]}:${participants[1]}`;

  let room = await prisma.room.findFirst({
    where: { name: dmRoomName },
    select: {
      id: true,
    },
  });

  if (!room) {
    room = await prisma.room.create({
      data: {
        name: dmRoomName,
        members: {
          connect: [{ id: currentUserId }, { id: targetUserId }],
        },
      },
      select: {
        id: true,
      },
    });
  }

  await prisma.hiddenRoom.deleteMany({
    where: {
      roomId: room.id,
      userId: currentUserId,
    },
  });

  const otherUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { name: true, image: { select: { id: true } } },
  });

  // Return JSON to the sender so their UI can update and navigate.
  return {
    newDm: {
      id: room.id,
      name: otherUser?.name ?? 'Direct Message',
      userImage: otherUser?.image ?? null,
    },
  };
}
