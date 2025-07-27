// app/routes/app/journal/journal.edit.$tradeId.tsx

import {
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';
import { useLoaderData } from 'react-router';
import { ZodError, z } from 'zod';
import { parseFormData } from '@mjackson/form-data-parser';
import { prisma } from '#/utils/db.server';
import { requireUserId } from '#/utils/auth.server';
import { TradeForm } from '#/components/journal/tradeForm'; // We'll reuse this
import { TradeDirection, TradeOutcome } from '@prisma/client';
import { invariantResponse } from '#/utils/misc';
import { redirectWithToast } from '#/utils/toaster.server';
import { processImage } from '#/utils/image.server';
import { uploadJournalImageToR2, deleteImageFromR2 } from '#/utils/r2.server';

const EditFormSchema = z.object({
  ticker: z.string().min(1, 'Ticker is required.').toUpperCase(),
  tradeDate: z.string().datetime('Invalid date format.'),
  direction: z.nativeEnum(TradeDirection),
  outcome: z.nativeEnum(TradeOutcome),
  pnl: z.coerce.number().optional(),
  tradeThesis: z.string().optional(),
  executionQuality: z.string().optional(),
  lessonsLearned: z.string().optional(),
  // New fields for the update action
  imagesToDelete: z.array(z.string()).optional(),
  _intent: z.literal('update'),
});

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tradeId } = params;
  invariantResponse(tradeId, 'Trade ID is required.');

  const trade = await prisma.tradeEntry.findFirst({
    where: { id: tradeId, userId },
    include: { images: { orderBy: { imageOrder: 'asc' } } },
  });

  if (!trade) {
    throw new Response('Not Found', { status: 404 });
  }
  return { trade };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { tradeId } = params;
  invariantResponse(tradeId, 'Trade ID is required.');

  const trade = await prisma.tradeEntry.findFirst({
    where: { id: tradeId, userId },
    select: { id: true },
  });
  if (!trade) throw new Response('Not Found', { status: 404 });

  const formData = await parseFormData(request);
  const validatedData = EditFormSchema.parse(Object.fromEntries(formData));

  const newImageFiles = formData.getAll('chartImage');
  const imagesToDelete = validatedData.imagesToDelete || [];

  const imagesToDeleteFromR2 = await prisma.tradeImage.findMany({
    where: { id: { in: imagesToDelete } },
    select: { objectKey: true },
  });

  const uploadPromises = newImageFiles.map(async (file) => {
    invariantResponse(file instanceof File, 'Uploaded item is not a file.');
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const { data: processed, contentType } = await processImage(imageBuffer);
    return uploadJournalImageToR2(processed, contentType, userId);
  });
  const newUploadedImages = await Promise.all(uploadPromises);

  await prisma.$transaction(async (tx) => {
    // A. Update the main trade entry
    await tx.tradeEntry.update({
      where: { id: tradeId },
      data: {
        ticker: validatedData.ticker,
        tradeDate: new Date(validatedData.tradeDate),
        direction: validatedData.direction,
        outcome: validatedData.outcome,
        pnl: validatedData.pnl,
        tradeThesis: validatedData.tradeThesis,
        executionQuality: validatedData.executionQuality,
        lessonsLearned: validatedData.lessonsLearned,
      },
    });

    if (imagesToDelete.length > 0) {
      await tx.tradeImage.deleteMany({
        where: { id: { in: imagesToDelete } },
      });
    }

    // C. Create new image records in the database
    if (newUploadedImages.length > 0) {
      await tx.tradeImage.createMany({
        data: newUploadedImages.map((img, index) => ({
          tradeEntryId: tradeId,
          objectKey: img.objectKey,
          imageOrder: index, // Note: this ordering might need refinement
        })),
      });
    }
  });

  if (imagesToDeleteFromR2.length > 0) {
    Promise.all(
      imagesToDeleteFromR2.map((img) => deleteImageFromR2(img.objectKey))
    );
  }

  const toast = {
    title: 'Success!',
    description: 'Journal entry updated.',
    type: 'success' as const,
  };
  return redirectWithToast(`/journal/${tradeId}`, toast);
}

export default function EditJournalPage() {
  const { trade } = useLoaderData<typeof loader>();

  return <TradeForm initialData={trade} />;
}
