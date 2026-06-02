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
        The Logto Kit supports three alternative backends depending on your infrastructure architecture. 
        Pick <strong>exactly one</strong> option below.
      </p>

      <h3 id={slugify("Option A: Supabase Storage REST API (Recommended)")} style={h3Style}>Option A: Supabase Storage REST API (Recommended)</h3>
      
      <p style={styles.textStyle}>
        This is the simplest option. It uses Supabase's direct REST API, bypassing standard S3 SDK overhead.
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

      <h3 id={slugify("Option C: Logto-Hosted Avatar Backend")} style={h3Style}>Option C: Logto-Hosted Avatar Backend</h3>
      
      <p style={styles.textStyle}>
        Alternatively, you can store avatar metadata directly within the Logto User Database using Logto's built-in Custom Data endpoint.
      </p>
      
      <CodeBlock title="Logto Custom Data Configuration" code={`# Switch backend from standard 's3' to 'logto'
PFP_BACKEND=logto`} />
      
      <p style={styles.textStyle}>
        When using <code style={styles.codeSmStyle}>PFP_BACKEND=logto</code>, the system updates the avatar URL in Logto directly. No external storage bucket is required, which is excellent for quick and simple deployments.
      </p>

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
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>Rate Limiting:</strong> Implements an automated in-memory rate limiter (5 uploads per minute, with background garbage-collection sweeping stale entries every 5 minutes to prevent memory leaks).
      </div>
    </div>
  );
}
