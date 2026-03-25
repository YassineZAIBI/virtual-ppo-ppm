/**
 * Prisma Middleware for Transparent Field-Level Encryption
 * =========================================================
 *
 * IMPORTANT: This middleware is NOT yet registered in src/lib/db.ts.
 * Do NOT add it to the Prisma client until all existing data has been
 * migrated (encrypted) — otherwise reads of existing plaintext data
 * will fail decryption. To activate:
 *
 *   1. Run a one-time migration script to encrypt existing field values.
 *   2. Then register this middleware in src/lib/db.ts:
 *
 *        import { encryptionMiddleware } from './prisma-encryption-middleware';
 *        db.$use(encryptionMiddleware);
 *
 * This module depends on a companion encryption utility. Since
 * src/lib/encryption.ts does not exist yet in this project, the
 * encrypt/decrypt functions are implemented inline using Node.js crypto.
 * If you later create src/lib/encryption.ts, update the imports below.
 */

import { Prisma } from '@prisma/client';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Encryption helpers (AES-256-GCM)
// ---------------------------------------------------------------------------

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const ENCRYPTION_PREFIX = 'enc:v1:';

function getEncryptionKey(): Buffer {
  const key = process.env.FIELD_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY environment variable is not set. ' +
        'Generate one with: openssl rand -hex 32'
    );
  }
  return Buffer.from(key, 'hex');
}

function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();

  // Format: enc:v1:<iv_base64>:<tag_base64>:<ciphertext_base64>
  return (
    ENCRYPTION_PREFIX +
    iv.toString('base64') +
    ':' +
    tag.toString('base64') +
    ':' +
    encrypted
  );
}

function decrypt(ciphertext: string): string {
  if (!ciphertext || !ciphertext.startsWith(ENCRYPTION_PREFIX)) {
    // Not encrypted (legacy plaintext) — return as-is
    return ciphertext;
  }

  try {
    const key = getEncryptionKey();
    const payload = ciphertext.slice(ENCRYPTION_PREFIX.length);
    const [ivB64, tagB64, dataB64] = payload.split(':');

    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(dataB64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // Gracefully handle decryption failures — the field might contain
    // plaintext from before encryption was enabled, or the key rotated.
    console.warn('[ENCRYPTION] Decryption failed, returning raw value:', err);
    return ciphertext;
  }
}

// ---------------------------------------------------------------------------
// Model-to-fields mapping: which fields to encrypt per Prisma model
// ---------------------------------------------------------------------------

const ENCRYPTED_FIELDS: Record<string, string[]> = {
  UserSettingsRecord: [
    'llmApiKey',
    'jiraApiToken',
    'slackBotToken',
    'confluenceApiToken',
    'smtpPassword',
  ],
};

// ---------------------------------------------------------------------------
// Field transformation helpers
// ---------------------------------------------------------------------------

function encryptFields(
  modelName: string,
  data: Record<string, any> | undefined
): void {
  if (!data) return;
  const fields = ENCRYPTED_FIELDS[modelName];
  if (!fields) return;

  for (const field of fields) {
    if (field in data && typeof data[field] === 'string' && data[field] !== '') {
      // Skip if already encrypted
      if (!data[field].startsWith(ENCRYPTION_PREFIX)) {
        data[field] = encrypt(data[field]);
      }
    }
  }
}

function decryptFields(modelName: string, record: Record<string, any>): void {
  if (!record) return;
  const fields = ENCRYPTED_FIELDS[modelName];
  if (!fields) return;

  for (const field of fields) {
    if (field in record && typeof record[field] === 'string' && record[field] !== '') {
      record[field] = decrypt(record[field]);
    }
  }
}

function decryptResult(modelName: string, result: any): any {
  if (!result) return result;
  if (!ENCRYPTED_FIELDS[modelName]) return result;

  if (Array.isArray(result)) {
    for (const item of result) {
      decryptFields(modelName, item);
    }
  } else if (typeof result === 'object') {
    decryptFields(modelName, result);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Prisma Middleware
// ---------------------------------------------------------------------------

const WRITE_ACTIONS = ['create', 'update', 'upsert', 'createMany', 'updateMany'];
const READ_ACTIONS = ['findUnique', 'findFirst', 'findMany'];

export const encryptionMiddleware: Prisma.Middleware = async (
  params: Prisma.MiddlewareParams,
  next: (params: Prisma.MiddlewareParams) => Promise<any>
) => {
  const modelName = params.model;
  if (!modelName || !ENCRYPTED_FIELDS[modelName]) {
    return next(params);
  }

  // --- Encrypt on write ---
  if (params.action && WRITE_ACTIONS.includes(params.action)) {
    if (params.args?.data) {
      encryptFields(modelName, params.args.data);
    }

    // Handle upsert which has both create and update data
    if (params.action === 'upsert') {
      if (params.args?.create) {
        encryptFields(modelName, params.args.create);
      }
      if (params.args?.update) {
        encryptFields(modelName, params.args.update);
      }
    }

    // Handle createMany with an array of records
    if (params.action === 'createMany' && Array.isArray(params.args?.data)) {
      for (const item of params.args.data) {
        encryptFields(modelName, item);
      }
    }
  }

  // Execute the query
  const result = await next(params);

  // --- Decrypt on read ---
  if (params.action && READ_ACTIONS.includes(params.action)) {
    return decryptResult(modelName, result);
  }

  // Also decrypt results from write operations (they return the written record)
  if (params.action && WRITE_ACTIONS.includes(params.action) && result) {
    return decryptResult(modelName, result);
  }

  return result;
};
