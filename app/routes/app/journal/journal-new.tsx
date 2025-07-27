// app/routes/journal.new.tsx

import { type ActionFunctionArgs } from 'react-router';
import { ZodError } from 'zod';
import { parseFormData } from '@mjackson/form-data-parser';
import { prisma } from '#/utils/db.server';
import { requireUserId } from '#/utils/auth.server';
import { TradeForm } from '#/components/journal/tradeForm';
import { processImage } from '#/utils/image.server';
import { uploadJournalImageToR2 } from '#/utils/r2.server';
import { invariantResponse } from '#/utils/misc';
import { redirectWithToast } from '#/utils/toaster.server';
import { CreateFormSchema } from '#/utils/journal-validations.server';

// The Action function that handles the form submission
export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await parseFormData(request);

  // --- 1. Handle Image Uploads First ---
  const files = formData.getAll('chartImage');
  invariantResponse(files.length > 0, 'At least one chart image is required.');

  const uploadPromises = files.map(async (file) => {
    invariantResponse(file instanceof File, 'Uploaded item is not a file.');
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const { data: processedImageBuffer, contentType } = await processImage(
      imageBuffer
    );
    return uploadJournalImageToR2(processedImageBuffer, contentType, userId);
  });

  const uploadedImages = await Promise.all(uploadPromises);

  try {
    const validatedData = CreateFormSchema.parse(Object.fromEntries(formData));

    // --- 3. Save Everything to Database in a Transaction ---
    // A transaction ensures that if any part fails, the whole operation is rolled back.
    const newTrade = await prisma.$transaction(async (tx) => {
      const trade = await tx.tradeEntry.create({
        data: {
          ...validatedData,
          tradeDate: new Date(validatedData.tradeDate),
          user: { connect: { id: userId } },
        },
        select: { id: true },
      });

      await tx.tradeImage.createMany({
        data: uploadedImages.map((img, index) => ({
          tradeEntryId: trade.id,
          objectKey: img.objectKey,
          imageOrder: index,
        })),
      });

      return trade;
    });

    const toast = {
      title: 'Success!',
      description: `Journal entry for ${validatedData.ticker} has been saved.`,
      type: 'success' as const,
    };
    // We will create this detail page next
    return redirectWithToast(`/journal/${newTrade.id}`, toast);
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: error.flatten() };
    }

    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function loader({ request }: ActionFunctionArgs) {
  await requireUserId(request);
  return null;
}

export default function NewJournalEntryPage() {
  return <TradeForm />;
}
