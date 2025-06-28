// app/routes/resources/chatImageResource.tsx

import type { LoaderFunctionArgs } from 'react-router';
import { prisma } from '#/utils/db.server';
import { getImageFromR2 } from '#/utils/r2.server';
import type { Readable } from 'stream';

// Helper function to convert Node.js stream to Buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) {
    return new Response('Image ID is required', { status: 400 });
  }

  // 1. Find the image record in the database to get the objectKey
  const imageRecord = await prisma.chatImage.findUnique({
    where: { id },
    select: {
      objectKey: true,
      contentType: true,
    },
  });

  if (!imageRecord) {
    return new Response('Image not found', { status: 404 });
  }

  // 2. Fetch the image data stream from R2 using the objectKey
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
      'Content-Type': imageRecord.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
