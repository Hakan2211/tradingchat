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

  // To ensure a unique room for any pair of users, we create a consistent key
  // by sorting their IDs alphabetically before joining them.
  const participants = [currentUserId, targetUserId].sort();
  const dmRoomName = `dm:${participants[0]}:${participants[1]}`;

  // 1. Find if a room already exists
  const existingRoom = await prisma.room.findUnique({
    where: { name: dmRoomName },
    select: { id: true },
  });

  if (existingRoom) {
    // --- THIS IS THE NEW LOGIC ---
    // Before redirecting, check if the current user has hidden this room.
    const hiddenEntry = await prisma.hiddenRoom.findUnique({
      where: {
        userId_roomId: {
          userId: currentUserId,
          roomId: existingRoom.id,
        },
      },
      select: { id: true }, // We only need the ID to delete it
    });

    // If an entry exists, it means the room is hidden. Let's un-hide it.
    if (hiddenEntry) {
      await prisma.hiddenRoom.delete({
        where: { id: hiddenEntry.id },
      });
    }

    // Now that we've ensured it's not hidden, redirect.
    return redirect(`/chat/${existingRoom.id}`);
  }

  // 2. If not, create a new room and add both users as members
  const newRoom = await prisma.room.create({
    data: {
      name: dmRoomName,
      // DMs don't typically have a public icon, but you could add one
      members: {
        connect: [{ id: currentUserId }, { id: targetUserId }],
      },
    },
    select: { id: true },
  });

  return redirect(`/chat/${newRoom.id}`);
}
