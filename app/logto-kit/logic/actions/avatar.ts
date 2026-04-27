'use server';

import * as Minio from 'minio';
import { introspectToken, assertSafeUserId } from '../utils';

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const MAX_BYTES = 2 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAGIC_BYTES: Record<string, [number[], number[]]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF], []],
  'image/png': [[0x89, 0x50, 0x4E, 0x47], []],
  'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38], []],
};

// ============================================================================
// Supabase Storage Helpers
// ============================================================================

async function supabaseStorageHeaders(
  contentType: string,
  upsert = false,
): Promise<Record<string, string>> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  }
  return {
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=0, must-revalidate',
    ...(upsert ? { 'x-upsert': 'true' } : {}),
    'apikey': serviceRoleKey,
  };
}

function supabaseRestBase(): string {
  const rawEndpoint = process.env.S3_ENDPOINT;
  if (!rawEndpoint) throw new Error('S3_ENDPOINT is not set.');
  return rawEndpoint.replace(/\/s3\/?$/, '');
}

async function uploadViaSupabase(
  bucket: string,
  key: string,
  bytes: Buffer,
  contentType: string,
): Promise<void> {
  const uploadUrl = `${supabaseRestBase()}/object/${bucket}/${key}`;
  const headers = await supabaseStorageHeaders(contentType, true);

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers,
    body: new Uint8Array(bytes),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`Storage upload failed (HTTP ${res.status}). Check your S3 and Supabase configuration.`);
  }
}

async function deleteFromSupabase(bucket: string, key: string): Promise<void> {
  const restBase = supabaseRestBase();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return;
  const url = `${restBase}/object/${bucket}/${key}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    cache: 'no-store',
  });
  if (!res.ok && res.status !== 404) {
    console.warn(`[deleteFromSupabase] Failed to delete ${key}: HTTP ${res.status}`);
  }
}

// ============================================================================
// MinIO Storage Helpers
// ============================================================================

async function uploadViaMinIO(
  bucket: string,
  key: string,
  bytes: Buffer,
  contentType: string,
): Promise<void> {
  const accessKey = process.env.S3_ACCESS_KEY_ID;
  const secretKey = process.env.S3_SECRET_ACCESS_KEY;
  const rawEndpoint = process.env.S3_ENDPOINT;

  if (!accessKey || !secretKey) {
    throw new Error('Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY, or set SUPABASE_SERVICE_ROLE_KEY to use the Supabase REST path.');
  }
  if (!rawEndpoint) throw new Error('S3_ENDPOINT is not set.');

  const parsed = new URL(rawEndpoint);
  const useSSL = parsed.protocol === 'https:';
  const endPoint = parsed.hostname;
  const port = parsed.port ? parseInt(parsed.port, 10) : useSSL ? 443 : 80;

  const minio = new Minio.Client({
    endPoint,
    port,
    useSSL,
    accessKey,
    secretKey,
    region: process.env.S3_REGION ?? 'auto',
  });

  try {
    await minio.putObject(bucket, key, bytes, bytes.length, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=0, must-revalidate',
    });
  } catch (err) {
    throw new Error('Storage upload failed. Please check your S3 configuration and credentials.');
  }
}

async function deleteFromMinio(bucket: string, key: string): Promise<void> {
  const rawEndpoint = process.env.S3_ENDPOINT;
  const accessKey = process.env.S3_ACCESS_KEY_ID;
  const secretKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!rawEndpoint || !accessKey || !secretKey) return;

  const parsed = new URL(rawEndpoint);
  const minio = new Minio.Client({
    endPoint: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === 'https:' ? 443 : 80,
    useSSL: parsed.protocol === 'https:',
    accessKey,
    secretKey,
    region: process.env.S3_REGION ?? 'auto',
  });

  try {
    await minio.removeObject(bucket, key);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('Not Found') && !msg.includes('NoSuchKey') && !msg.includes('404')) {
      console.warn(`[deleteFromMinio] Failed to delete ${key}: ${msg}`);
    }
  }
}

// ============================================================================
// Avatar Management Helpers
// ============================================================================

async function deleteOldAvatars(bucket: string, userId: string, newExt: string): Promise<void> {
  const extensions = ['jpg', 'png', 'webp', 'gif'].filter(ext => ext !== newExt);
  for (const ext of extensions) {
    const key = `${userId}/you.${ext}`;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await deleteFromSupabase(bucket, key);
    } else {
      await deleteFromMinio(bucket, key);
    }
  }
}

/**
 * Validates a user token via introspection.
 * @param accessToken - The access token to validate.
 * @param userId - The expected user ID.
 */
async function validateUserToken(accessToken: string, userId: string): Promise<void> {
  await assertSafeUserId(userId);
  
  const introspection = await introspectToken(accessToken);
  
  if (!introspection.active) {
    throw new Error('UNAUTHORIZED: token is not active or has been revoked.');
  }
  
  if (introspection.sub !== userId) {
    throw new Error('UNAUTHORIZED: token subject does not match the provided userId.');
  }
}

// ============================================================================
// MIME Detection
// ============================================================================

/**
 * Detects the MIME type from file bytes using magic numbers.
 * @param bytes - The file bytes.
 * @returns The detected MIME type or null if not recognized.
 */
function detectMimeFromBytes(bytes: Buffer): string | null {
  for (const [mime, [prefix, at]] of Object.entries(MAGIC_BYTES)) {
    // Check prefix bytes first
    if (bytes.length < prefix.length) continue;

    let match = true;
    for (let i = 0; i < prefix.length; i++) {
      if (bytes[i] !== prefix[i]) { match = false; break; }
    }
    if (!match) continue;

    // Check additional bytes (for WebP, which checks bytes 8-11)
    if (at.length > 0) {
      if (bytes.length < 8 + at.length) continue;
      for (let i = 0; i < at.length; i++) {
        if (bytes[8 + i] !== at[i]) { match = false; break; }
      }
    }
    if (match) return mime;
  }
  return null;
}

// ============================================================================
// Avatar Upload Action
// ============================================================================

/**
 * Uploads a user avatar to S3-compatible storage.
 * @param formData - FormData containing 'file', 'accessToken', and 'userId'.
 * @returns Object containing the public URL of the uploaded avatar.
 */
export async function uploadAvatar(
  formData: FormData,
): Promise<{ url: string }> {
  const rawFile = formData.get('file');
  const rawAccessToken = formData.get('accessToken');
  const rawUserId = formData.get('userId');

  if (!(rawFile instanceof File) || typeof rawAccessToken !== 'string' || typeof rawUserId !== 'string') {
    throw new Error('Bad request — file, accessToken, and userId are all required and must be correct types.');
  }

  const file = rawFile;
  const accessToken = rawAccessToken;
  const userId = rawUserId;

  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
    throw new Error(`Invalid file type "${file.type}". Allowed: ${ALLOWED_MIME.join(', ')}.`);
  }

  if (file.size > MAX_BYTES) {
    throw new Error(`File is ${(file.size / 1024 / 1024).toFixed(2)} MB — limit is 2 MB.`);
  }

  const arrayBuf = await file.arrayBuffer();
  const bytes = Buffer.from(arrayBuf);
  const detectedMime = detectMimeFromBytes(bytes);
  if (!detectedMime || detectedMime !== file.type) {
    throw new Error(`File content does not match declared type "${file.type}". Upload rejected.`);
  }

  await validateUserToken(accessToken, userId);

  const publicBase = process.env.S3_PUBLIC_URL?.replace(/\/$/, '');
  if (!publicBase) {
    throw new Error(
      'S3_PUBLIC_URL is not set. It must be the public-facing base URL for ' +
        'reading objects — NOT the S3 API endpoint.',
    );
  }

  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) throw new Error('S3_BUCKET_NAME is not set.');

  const ext = MIME_TO_EXT[file.type] || 'png';
  const key = `${userId}/you.${ext}`;

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await uploadViaSupabase(bucket, key, bytes, file.type);
  } else {
    await uploadViaMinIO(bucket, key, bytes, file.type);
  }

  await deleteOldAvatars(bucket, userId, ext);

  return { url: `${publicBase}/${key}?v=${Date.now()}` };
}
