// app/utils/r2.server.ts

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { createId as cuid } from '@paralleldrive/cuid2';
import { Readable } from 'stream';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  throw new Error('Cloudflare R2 credentials are not configured.');
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export async function uploadImageToR2(
  imageBuffer: Buffer,
  contentType: string,
  userId: string
) {
  const objectKey = `chat-images/${userId}/${cuid()}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    Body: imageBuffer,
    ContentType: contentType,
  });

  await s3.send(command);

  return { objectKey };
}

export function getImageUrl(objectKey: string) {
  if (!process.env.R2_PUBLIC_URL) {
    // In a real app, you might want a fallback or a different way
    // to serve images if the bucket isn't public, like a resource route
    // that generates signed URLs.
    return '/images/placeholder.png';
  }
  return `${process.env.R2_PUBLIC_URL}/${objectKey}`;
}

export async function deleteImageFromR2(objectKey: string) {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });

  try {
    await s3.send(command);
    console.log(`[R2] Successfully deleted object: ${objectKey}`);
  } catch (error) {
    console.error(`[R2] Failed to delete object: ${objectKey}`, error);
    // Don't re-throw the error. We don't want to block the UI response
    // if the R2 deletion fails. We just log it.
  }
}

export async function getImageFromR2(objectKey: string) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });

  try {
    const response = await s3.send(command);
    // The body of the response is a ReadableStream.
    // We can pass this directly to the Response object in our loader.
    if (response.Body instanceof Readable) {
      return response.Body;
    }
    // This should not happen in a Node.js environment, but it's a safe fallback.
    return null;
  } catch (error) {
    console.error(`[R2] Failed to get object: ${objectKey}`, error);
    return null;
  }
}
