'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function AvatarUpload() {
  const styles = useDocStyles();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Avatar Upload Integration">
        <p style={styles.textStyle}>
          Profile picture uploads require an active file storage provider. 
          The Logto Kit supports three alternative backends depending on your infrastructure architecture. 
          Pick <strong>exactly one</strong> option below.
        </p>
      </SectionWrap>

      <SectionWrap label="Option A: Supabase Storage REST API (Recommended)">
        <p style={styles.textStyle}>
          This is the simplest option. It uses Supabase's direct REST API, bypassing standard S3 SDK overhead.
          You must create a public bucket named <code style={styles.codeSmStyle}>avatars</code> in your Supabase project.
        </p>
        <CodeBlock title="Supabase Configuration" code={`# Supabase Dashboard → Project Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Storage Parameters
S3_BUCKET_NAME=avatars
S3_PUBLIC_URL=https://your-project-id.supabase.co/storage/v1/object/public/avatars`} />
        <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
          <strong style={styles.strongNoteStyle}>Why Supabase?</strong> Setting <code style={styles.codeSmStyle}>SUPABASE_SERVICE_ROLE_KEY</code> bypasses the S3 SDK client and posts files directly to the storage bucket via REST APIs, which is faster and highly reliable.
        </div>
      </SectionWrap>

      <SectionWrap label="Option B: Standard S3 SDK (AWS S3, MinIO, Cloudflare R2)">
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
        <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
          <strong style={styles.strongNoteStyle}>Access Policy:</strong> Ensure your target S3 bucket is configured with a <strong>Public Read Policy</strong> so avatars can be rendered on client browsers without presigned URL expiry overhead.
        </div>
      </SectionWrap>

      <SectionWrap label="Option C: Logto-Hosted Avatar Backend">
        <p style={styles.textStyle}>
          Alternatively, you can store avatar metadata directly within the Logto User Database using Logto's built-in Custom Data endpoint.
        </p>
        <CodeBlock title="Logto Custom Data Configuration" code={`# Switch backend from standard 's3' to 'logto'
PFP_BACKEND=logto`} />
        <p style={styles.textStyle}>
          When using <code style={styles.codeSmStyle}>PFP_BACKEND=logto</code>, the system updates the avatar URL in Logto directly. No external storage bucket is required, which is excellent for quick and simple deployments.
        </p>
      </SectionWrap>
    </div>
  );
}
