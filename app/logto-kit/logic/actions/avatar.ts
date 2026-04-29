'use server';

import * as Minio from 'minio';
import { introspectToken } from '../utils';
import { assertSafeUserId } from '../guards';
import { getTokenForServerAction } from './tokens';

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
    throw new Error('UPLOAD_FAILED');
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
  if (!rawEndpoint) throw new Error('UPLOAD_FAILED');
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
    // Log detail server-side; never surface to client.
    console.warn(`[uploadViaSupabase] HTTP ${res.status}`);
    throw new Error('UPLOAD_FAILED');
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

  if (!accessKey || !secretKey || !rawEndpoint) {
    throw new Error('UPLOAD_FAILED');
  }

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
    console.warn('[uploadViaMinIO] putObject failed', err instanceof Error ? err.message : err);
    throw new Error('UPLOAD_FAILED');
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

// ============================================================================
// MIME Detection
// ============================================================================

function detectMimeFromBytes(bytes: Buffer): string | null {
  for (const [mime, [prefix, at]] of Object.entries(MAGIC_BYTES)) {
    if (bytes.length < prefix.length) continue;

    let match = true;
    for (let i = 0; i < prefix.length; i++) {
      if (bytes[i] !== prefix[i]) { match = false; break; }
    }
    if (!match) continue;

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
// Avatar Upload Server Action
// ============================================================================

/**
 * Uploads an avatar for the currently authenticated user.
 *
 * Security model (Phase 1, Finding 1 + Phase 3, Finding 3):
 *
 *   - FormData carries ONLY the file. The access token and user ID are
 *     derived server-side from the session cookie — never accepted from
 *     the client.
 *   - Next.js Server Actions enforce same-origin at the framework level,
 *     eliminating CSRF from cross-site origins.
 *
 * Validation:
 *   - MIME declared vs magic-bytes detected (rejects MIME spoofing).
 *   - File size ≤ 2 MB.
 *   - MIME in allowlist.
 *
 * Storage path is `${userId}/you.${ext}`. userId is asserted safe to
 * prevent any path-traversal attempt.
 *
 * @param formData FormData containing a single `file` field.
 * @returns Object containing the public URL of the uploaded avatar.
 */
export async function uploadAvatar(
  formData: FormData,
): Promise<{ url: string }> {
  // ── Derive token + userId server-side ────────────────────────────────
  const sessionToken = await getTokenForServerAction();
  const introspection = await introspectToken(sessionToken);

  if (!introspection.active) {
    throw new Error('UNAUTHORIZED');
  }
  const userId = introspection.sub;
  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }
  assertSafeUserId(userId);

  // ── Extract and validate file ────────────────────────────────────────
  const rawFile = formData.get('file');
  if (!(rawFile instanceof File)) {
    throw new Error('UPLOAD_INVALID_TYPE');
  }
  const file = rawFile;

  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
    throw new Error('UPLOAD_INVALID_TYPE');
  }

  if (file.size > MAX_BYTES) {
    throw new Error('UPLOAD_TOO_LARGE');
  }

  const arrayBuf = await file.arrayBuffer();
  const bytes = Buffer.from(arrayBuf);
  const detectedMime = detectMimeFromBytes(bytes);
  if (!detectedMime || detectedMime !== file.type) {
    throw new Error('UPLOAD_INVALID_TYPE');
  }

  // ── Storage config ───────────────────────────────────────────────────
  const publicBase = process.env.S3_PUBLIC_URL?.replace(/\/$/, '');
  if (!publicBase) {
    throw new Error('UPLOAD_FAILED');
  }

  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) throw new Error('UPLOAD_FAILED');

  const ext = MIME_TO_EXT[file.type] || 'png';
  const key = `${userId}/you.${ext}`;

  // ── Upload ───────────────────────────────────────────────────────────
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await uploadViaSupabase(bucket, key, bytes, file.type);
  } else {
    await uploadViaMinIO(bucket, key, bytes, file.type);
  }

  await deleteOldAvatars(bucket, userId, ext);

  const { audit } = await import('../audit');
  await audit({ actor: userId, action: 'avatar.upload', resource: userId });

  return { url: `${publicBase}/${key}?v=${Date.now()}` };
}
