import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, readFile, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { isS3Configured } from './s3.util';

/**
 * Storage for files that must never be reachable by URL — passports, visas,
 * tickets.
 *
 * Deliberately separate from storage.controller.ts. That one writes into
 * apps/api/uploads, which main.ts serves statically at /uploads/* with no
 * authentication: correct for an itinerary photo, catastrophic for a passport
 * scan, where knowing the filename would be enough to download someone's
 * identity document.
 *
 * Files here go to apps/api/private-uploads (served by nothing) or to S3 under
 * a private/ prefix, and come back out only through an endpoint that has
 * already checked who is asking.
 */

const PRIVATE_PREFIX = 'private/';

let cachedClient: S3Client | null = null;

function client(): S3Client {
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

/**
 * __dirname at runtime is apps/api/dist/storage, so the directory sits two
 * levels up — the same reasoning as the public uploads path, and the same trap:
 * process.cwd() is the repo root under Railway's start command, not apps/api.
 */
function privateDir(): string {
  return join(__dirname, '..', '..', 'private-uploads');
}

export async function putPrivate(buffer: Buffer, key: string, contentType: string): Promise<void> {
  if (isS3Configured()) {
    await client().send(
      new PutObjectCommand({
        Bucket: process.env.OBJECT_STORAGE_BUCKET!,
        Key: PRIVATE_PREFIX + key,
        Body: buffer,
        ContentType: contentType,
        // No public-read ACL. The bucket may be public for itinerary photos;
        // these objects must not inherit that.
        ACL: 'private',
      }),
    );
    return;
  }
  const dir = privateDir();
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, key), buffer);
}

export async function getPrivate(key: string): Promise<Buffer> {
  if (isS3Configured()) {
    const res = await client().send(
      new GetObjectCommand({ Bucket: process.env.OBJECT_STORAGE_BUCKET!, Key: PRIVATE_PREFIX + key }),
    );
    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as AsyncIterable<Buffer>) chunks.push(chunk);
    return Buffer.concat(chunks);
  }
  return readFile(join(privateDir(), key));
}

/** Best-effort; a missing file must not block deleting the database row. */
export async function removePrivate(key: string): Promise<void> {
  if (isS3Configured()) return;
  try {
    await unlink(join(privateDir(), key));
  } catch {
    /* already gone */
  }
}
