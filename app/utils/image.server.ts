import sharp from 'sharp';

/*
 * Processes an image buffer using `sharp`.
 * Resizes, compresses, and converts to WebP format.
 * @param imageBuffer The raw image buffer from the upload.
 * @returns An object with the optimized image buffer and its content type.
 */
export async function processImage(
  imageBuffer: Buffer
): Promise<{ data: Buffer; contentType: string }> {
  console.log('[SHARP] Starting image processing...');

  try {
    const optimizedBuffer = await sharp(imageBuffer)
      .resize({
        width: 1024, // Resize to a max width of 1024px
        height: 1024, // Resize to a max height of 1024px
        fit: 'inside', // Maintain aspect ratio, don't crop
        withoutEnlargement: true, // Don't enlarge images smaller than the target size
      })
      .webp({ quality: 70 }) // Convert to WebP format with 80% quality
      .toBuffer();

    console.log(
      `[SHARP] Original size: ${Math.round(imageBuffer.length / 1024)} KB`
    );
    console.log(
      `[SHARP] Optimized size: ${Math.round(optimizedBuffer.length / 1024)} KB`
    );

    return {
      data: optimizedBuffer,
      contentType: 'image/webp', // We are consistently converting to WebP
    };
  } catch (error) {
    console.error('Sharp processing failed:', error);
    // You could re-throw the error or return the original image as a fallback
    throw new Error('Failed to process image.');
  }
}
