import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let cachedClient: S3Client | null = null;

export function isS3Configured(): boolean {
  return Boolean(
    process.env.OBJECT_STORAGE_ACCESS_KEY_ID &&
      process.env.OBJECT_STORAGE_KEY &&
      process.env.OBJECT_STORAGE_BUCKET &&
      process.env.OBJECT_STORAGE_REGION,
  );
}

// OBJECT_STORAGE_ENDPOINT is optional and only needed for S3-compatible
// providers that aren't AWS itself (e.g. a Railway Bucket, backed by Tigris)
// — real AWS S3 resolves its endpoint from the region alone.
export function getClient(): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: process.env.OBJECT_STORAGE_REGION!,
      ...(process.env.OBJECT_STORAGE_ENDPOINT ? { endpoint: process.env.OBJECT_STORAGE_ENDPOINT } : {}),
      credentials: {
        accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.OBJECT_STORAGE_KEY!,
      },
    });
  }
  return cachedClient;
}

// Railway Buckets (and most non-AWS S3-compatible providers) have no
// public-read mode — a bare object URL 403s, bucket policies and ACLs are
// both rejected as NotImplemented/AccessDenied. So this returns the same
// relative "/uploads/:key" shape the local-disk fallback uses, and
// UploadsRedirectController resolves it to a short-lived presigned GET URL
// on each request instead of a permanent public link.
export async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
  await getClient().send(
    new PutObjectCommand({ Bucket: process.env.OBJECT_STORAGE_BUCKET!, Key: key, Body: buffer, ContentType: contentType }),
  );
  return `/uploads/${key}`;
}

/** 1-hour signed GET URL — long enough for a page load plus any retries, short enough that a leaked link doesn't stay valid. */
export async function getPresignedUploadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: process.env.OBJECT_STORAGE_BUCKET!, Key: key });
  return getSignedUrl(getClient(), command, { expiresIn: 3600 });
}
