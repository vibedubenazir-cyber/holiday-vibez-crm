import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let cachedClient: S3Client | null = null;

export function isS3Configured(): boolean {
  return Boolean(
    process.env.OBJECT_STORAGE_ACCESS_KEY_ID &&
      process.env.OBJECT_STORAGE_KEY &&
      process.env.OBJECT_STORAGE_BUCKET &&
      process.env.OBJECT_STORAGE_REGION,
  );
}

function getClient(): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: process.env.OBJECT_STORAGE_REGION!,
      credentials: {
        accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.OBJECT_STORAGE_KEY!,
      },
    });
  }
  return cachedClient;
}

export async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const bucket = process.env.OBJECT_STORAGE_BUCKET!;
  const region = process.env.OBJECT_STORAGE_REGION!;
  await getClient().send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }),
  );
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
