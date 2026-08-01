import * as crypto from 'crypto';

// Field-level encryption for passport numbers (spec Section 4: "encrypted"; Section 11:
// "encryption at rest, field-level for passport numbers"). Key comes from env, never
// hardcoded; falls back to a dev-only default so local runs don't crash without one set.
const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY ?? 'dev-only-32-byte-key-not-for-prod!!';
  return crypto.createHash('sha256').update(raw).digest();
}

export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

export function decryptField(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}
