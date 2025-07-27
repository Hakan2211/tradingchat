import { type ActionFunctionArgs } from 'react-router';
import { parseFormData } from '@mjackson/form-data-parser';
import { requireUserId } from '#/utils/auth.server';
import { invariantResponse } from '#/utils/misc';
import { processImage } from '#/utils/image.server';
import { uploadJournalImageToR2 } from '#/utils/r2.server';

const MAX_UPLOAD_SIZE_MB = 5;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await parseFormData(request);

  const files = formData.getAll('chartImage');
  invariantResponse(files.length > 0, 'No image files provided.');
  for (const file of files) {
    invariantResponse(
      file instanceof File,
      'All uploaded items must be files.'
    );
    invariantResponse(file.size > 0, 'Image files cannot be empty.');
    invariantResponse(
      file.size <= MAX_UPLOAD_SIZE_BYTES,
      `Each image size must be less than ${MAX_UPLOAD_SIZE_MB}MB.`
    );
  }

  try {
    const uploadPromises = files.map(async (file) => {
      if (!(file instanceof File)) return;

      const imageBuffer = Buffer.from(await file.arrayBuffer());
      const { data: processedImageBuffer, contentType } = await processImage(
        imageBuffer
      );
      return uploadJournalImageToR2(processedImageBuffer, contentType, userId);
    });

    const results = await Promise.all(uploadPromises);

    return {
      success: true,
      images: results.filter(Boolean).map((result) => ({
        objectKey: result?.objectKey,
        url: result?.url,
      })),
    };
  } catch (error) {
    console.error('Multi-image upload failed:', error);
    if (error instanceof Response) throw error;
    return {
      success: false,
      error: 'Failed to process or upload one or more images.',
    };
  }
}
