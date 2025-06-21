import type { LoaderFunctionArgs } from 'react-router';
import { prisma } from '#/utils/db.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { id } = params;
  console.log('Image loader called for ID:', id);

  if (!id) {
    console.log('No image ID provided');
    return new Response('Image ID is required', { status: 400 });
  }

  const image = await prisma.userImage.findUnique({
    where: { id },
    select: {
      blob: true,
      contentType: true,
    },
  });

  if (!image) {
    console.log('Image not found for ID:', id);
    return new Response('Image not found', { status: 404 });
  }

  console.log(
    'Image found, size:',
    image.blob.length,
    'type:',
    image.contentType
  );
  return new Response(image.blob, {
    status: 200,
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
