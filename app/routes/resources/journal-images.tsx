import type { LoaderFunctionArgs } from 'react-router';
import { prisma } from '#/utils/db.server';
import { requireUserId } from '#/utils/auth.server';
import { getImageFromR2 } from '#/utils/r2.server';
import type { Readable } from 'stream';

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireUserId(request);
  const { imageId } = params;

  if (!imageId) {
    return new Response('Image ID is required', { status: 400 });
  }

  const imageRecord = await prisma.tradeImage.findUnique({
    where: { id: imageId },
    select: { objectKey: true },
  });

  if (!imageRecord) {
    return new Response('Image not found', { status: 404 });
  }

  const imageStream = await getImageFromR2(imageRecord.objectKey);

  if (!imageStream) {
    return new Response('Image could not be retrieved from storage', {
      status: 500,
    });
  }

  const imageBuffer = await streamToBuffer(imageStream);
  return new Response(imageBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/webp', // We know we convert images to WebP
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
