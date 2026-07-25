'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function AvatarUpload() {
  const styles = useDocStyles();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const h2Style: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: isDark ? '#f3f4f6' : '#111827',
    marginTop: '32px',
    marginBottom: '16px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
    paddingBottom: '8px',
  };

  const h3Style: React.CSSProperties = {
    fontSize: '1.05rem',
    fontWeight: 600,
    color: isDark ? '#e5e7eb' : '#1f2937',
    marginTop: '24px',
    marginBottom: '12px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'}`,
    paddingBottom: '4px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h2 id={slugify("Avatar Upload Integration")} style={{ ...h2Style, marginTop: 0 }}>Avatar Upload Integration</h2>
      
      <p style={styles.textStyle}>
        Profile picture uploads require an active file storage provider.
        The Logto Kit supports two backends: <code style={styles.codeSmStyle}>s3</code> and <code style={styles.codeSmStyle}>logto</code>.
        The <code style={styles.codeSmStyle}>s3</code> backend has two sub-strategies (Option A and Option B), chosen automatically based on whether <code style={styles.codeSmStyle}>SUPABASE_SERVICE_ROLE_KEY</code> is set.
        Pick <strong>exactly one</strong> option below.
      </p>

      <h3 id={slugify("Option A: Supabase Storage REST API")} style={h3Style}>Option A: Supabase Storage REST API</h3>
      
      <p style={styles.textStyle}>
        This is the simplest option. It uses Supabase&apos;s direct REST API, bypassing standard S3 SDK overhead.
        You must create a public bucket named <code style={styles.codeSmStyle}>avatars</code> in your Supabase project.
      </p>
      
      <CodeBlock title="Supabase Configuration" code={`# Supabase Dashboard → Project Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Storage Parameters
S3_ENDPOINT=https://your-project-id.supabase.co/storage/v1/s3
S3_BUCKET_NAME=avatars
S3_PUBLIC_URL=https://your-project-id.supabase.co/storage/v1/object/public/avatars`} />
      
      <div style={{ ...styles.noteStyle, marginTop: '16px' }}>
        <strong style={styles.strongNoteStyle}>Why Supabase?</strong> Setting <code style={styles.codeSmStyle}>SUPABASE_SERVICE_ROLE_KEY</code> bypasses the S3 SDK client and posts files directly to the storage bucket via REST APIs, which is faster and highly reliable. Note that <code style={styles.codeSmStyle}>S3_ENDPOINT</code> is still required because the direct REST base URL is derived from it.
      </div>

      <h3 id={slugify("Option B: Standard S3 SDK (AWS S3, MinIO, Cloudflare R2)")} style={h3Style}>Option B: Standard S3 SDK (AWS S3, MinIO, Cloudflare R2)</h3>
      
      <p style={styles.textStyle}>
        If you use standard AWS S3, local MinIO, or Cloudflare R2, configure the standard S3 credentials. 
        The Kit falls back to the S3 SDK if <code style={styles.codeSmStyle}>SUPABASE_SERVICE_ROLE_KEY</code> is left unset.
      </p>
      
      <CodeBlock title="S3 SDK Configuration" code={`S3_ENDPOINT=https://your-s3-endpoint-or-compat-url
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-key
S3_REGION=auto
S3_BUCKET_NAME=avatars
S3_PUBLIC_URL=https://your-public-cdn-or-bucket-domain/avatars`} />
      
      <div style={{ ...styles.noteStyle, marginTop: '16px' }}>
        <strong style={styles.strongNoteStyle}>Access Policy:</strong> Ensure your target S3 bucket is configured with a <strong>Public Read Policy</strong> so avatars can be rendered on client browsers without presigned URL expiry overhead.
      </div>

      <h3 id={slugify("Option C: Logto-Hosted Avatar Backend (Blacktop only)")} style={h3Style}>Option C: Logto-Hosted Avatar Backend (Blacktop only)</h3>
      
      <p style={styles.textStyle}>
        This option is only available when <code style={styles.codeSmStyle}>BACKEND_TYPE=blacktop</code>. In upstream mode, the runtime forcibly falls back to <code style={styles.codeSmStyle}>s3</code> even if you set <code style={styles.codeSmStyle}>PFP_BACKEND=logto</code>.
      </p>
      
      <CodeBlock title="Blacktop-only Configuration" code={`# Required for Option C
BACKEND_TYPE=blacktop

# Switch backend from standard 's3' to 'logto'
PFP_BACKEND=logto`} />
      
      <p style={styles.textStyle}>
        Implementation detail: the Server Action <code style={styles.codeSmStyle}>uploadAvatar</code> forwards a multipart request to <code style={styles.codeSmStyle}>{`{ENDPOINT}/api/my-account/avatar`}</code> using the current user&apos;s server-derived session token. This path is non-standard for stock upstream deployments and is intended for the Blacktop fork capability mode.
      </p>

      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Compatibility note:</strong> If you run upstream Logto (OSS/Cloud default behavior), use Option A or Option B. Option C is fork-specific.
      </div>

      <h2 id={slugify("Architecture & Security")} style={h2Style}>Architecture & Security</h2>
      
      <p style={styles.textStyle}>
        The avatar upload flow <strong>does not utilize traditional REST route handlers</strong> (such as <code style={styles.codeSmStyle}>/api/avatar</code>). Instead, it is natively powered by <strong>Next.js Server Actions</strong> (<code style={styles.codeSmStyle}>uploadAvatar</code> in <code style={styles.codeSmStyle}>app/logto-kit/logic/actions/avatar.ts</code>).
      </p>
      
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Session Integrity:</strong> Derives user ID and OIDC access token entirely server-side from session cookies, blocking parameter tampering or user spoofing.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>CSRF Protection:</strong> Enforces same-origin validation natively at the Next.js framework level to protect against CSRF.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Rate Limiting:</strong> Implements a centralized count+reset rate limiter (5 uploads per 60-second window per user) via <code style={styles.codeSmStyle}>createRateLimiter</code> from <code style={styles.codeSmStyle}>app/lib/distributed-state.ts</code> (in-memory by default, per-instance only; Redis-backed when <code style={styles.codeSmStyle}>REDIS_URL</code> is set, cross-instance safe). Uses fixed-window expiry, no manual cleanup needed.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>File Validation:</strong> Max file size is 2 MB. Allowed MIME types: JPEG, PNG, WebP, GIF. Magic-byte detection verifies file contents against the declared MIME type to prevent spoofed uploads.
      </div>
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>Old Avatar Cleanup:</strong> When a user re-uploads, the old avatar is deleted from storage before the new one is saved. The public URL returned by the server includes a <code style={styles.codeSmStyle}>?v=</code> cache-busting suffix.
      </div>

      <h2 id={slugify("Client-Side")} style={h2Style}>Client-Side</h2>

      <h3 id={slugify("useAvatarUpload Hook")} style={h3Style}>useAvatarUpload Hook</h3>

      <p style={styles.textStyle}>
        Import from <code style={styles.codeSmStyle}>app/logto-kit/hooks/use-avatar-upload</code>. Returns an object with the following members:
      </p>

      <CodeBlock title="useAvatarUpload API" code={`import { useAvatarUpload } from '@/app/logto-kit/hooks/use-avatar-upload'

const { upload, isUploading, error, clearError } = useAvatarUpload({
  onSuccess: (url) => { /* avatar URL returned by server */ },
  onError: (message) => { /* error string */ },
})

// Trigger upload
const url = await upload(file)`} />

      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>upload(file: File):</strong> Accepts a <code style={styles.codeSmStyle}>File</code> object, calls the <code style={styles.codeSmStyle}>uploadAvatar</code> Server Action internally. Returns the public avatar URL on success, or <code style={styles.codeSmStyle}>null</code> on failure. Guards against concurrent calls (returns <code style={styles.codeSmStyle}>null</code> immediately if already uploading).
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>isUploading: boolean</strong> -- <code style={styles.codeSmStyle}>true</code> while the Server Action is in flight. Resets in the <code style={styles.codeSmStyle}>finally</code> block.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>error: string | null</strong> -- Contains the error message string on failure, <code style={styles.codeSmStyle}>null</code> otherwise. Cleared automatically on next <code style={styles.codeSmStyle}>upload()</code> call and on <code style={styles.codeSmStyle}>clearError()</code>.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>clearError():</strong> Resets <code style={styles.codeSmStyle}>error</code> to <code style={styles.codeSmStyle}>null</code>.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>onSuccess(url: string):</strong> Callback fired after the server returns a valid avatar URL.
      </div>
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>onError(message: string):</strong> Callback fired on failure. Receives the error message string, not an Error object.
      </div>

      <h3 id={slugify("ImageCropper Shape Options")} style={h3Style}>ImageCropper Shape Options</h3>

      <p style={styles.textStyle}>
        The <code style={styles.codeSmStyle}>ImageCropper</code> component (from <code style={styles.codeSmStyle}>app/logto-kit/components/dashboard/shared/ImageCropper</code>) accepts an optional <code style={styles.codeSmStyle}>shape</code> prop that controls the crop mask applied to the selected image.
      </p>

      <CodeBlock title="ImageCropper shape prop" code={`import { ImageCropper } from '@/app/logto-kit/components/dashboard/shared/ImageCropper'

<ImageCropper
  ref={cropperRef}
  shape="circle"   // "circle" | "sq" | "rsq"
  onCropped={handleCropped}
/>`} />

      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>circle (default):</strong> Applies a circular mask. Standard for profile avatars.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>sq:</strong> Applies a square mask (no rounding).
      </div>
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>rsq:</strong> Applies a rounded-rectangle mask.
      </div>
    </div>
  );
}
