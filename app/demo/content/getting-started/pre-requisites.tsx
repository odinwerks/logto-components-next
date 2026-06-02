'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function PreRequisites() {
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

  const customTableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8rem',
    marginBottom: '20px',
    marginTop: '12px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
  };

  const customThStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: `2px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`,
    background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
    color: isDark ? 'rgba(255,255,255,0.6)' : '#475569',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const customTdStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'}`,
    color: isDark ? 'rgba(255,255,255,0.55)' : '#334155',
    verticalAlign: 'top',
    lineHeight: '1.5',
  };

  const customTdPropStyle: React.CSSProperties = {
    ...customTdStyle,
    color: isDark ? '#9cdcdb' : '#0369a1',
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h2 id={slugify("Pre-requisites")} style={{ ...h2Style, marginTop: 0 }}>Pre-requisites</h2>
      
      <p style={styles.textStyle}>
        Before setting up any Logto secured app, you will need a functional instance of the IAM platform.
      </p>
      <p style={styles.textStyle}>
        You can use the managed SaaS, or self-host. We advise self-hosting due to more control and features.
      </p>

      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '25%' }}>Instance</th>
            <th style={{ ...customThStyle, width: '60%' }}>Differentiator</th>
            <th style={{ ...customThStyle, width: '15%' }}>Deployment</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>Logto Blacktop</td>
            <td style={customTdStyle}>
              Has a new S3 backend, updated pfp api, and unlocked features previously limited to premium tiers of the cloud instance. This gives you the most features and was tested most extensively on this project.
            </td>
            <td style={customTdStyle}>Self-hosted</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Logto IO (OSS)</td>
            <td style={customTdStyle}>
              The base instance of Logto. More feature-rich compared to the free tier of Logto Cloud, but lacks the premium features of Logto Cloud out of the box.
            </td>
            <td style={customTdStyle}>Self-hosted</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Logto Cloud</td>
            <td style={customTdStyle}>
              The official hosted SaaS edition. You pay for it to function at scale.
            </td>
            <td style={customTdStyle}>SaaS (Hosted)</td>
          </tr>
        </tbody>
      </table>

      <h2 id={slugify("Feature Comparison Matrix")} style={h2Style}>Feature Comparison Matrix</h2>

      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '25%' }}>Feature</th>
            <th style={{ ...customThStyle, width: '25%' }}>Logto IO (OSS)</th>
            <th style={{ ...customThStyle, width: '25%' }}>Logto Cloud (Pro)</th>
            <th style={{ ...customThStyle, width: '25%' }}>Logto Blacktop (Fork)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>Licensing & Cost</td>
            <td style={customTdStyle}>MPL-2.0 (Free)</td>
            <td style={customTdStyle}>SaaS ($24/mo base + high add-on fees)</td>
            <td style={customTdStyle}>MPL-2.0 (Free)</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>"Bring Your UI" ZIP Upload</td>
            <td style={customTdStyle}>❌ Stripped from Console</td>
            <td style={customTdStyle}>Available (Cloud Managed)</td>
            <td style={customTdStyle}><strong>Available (In-Process AdmZip)</strong></td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>SAML Outbound Apps</td>
            <td style={customTdStyle}>⚠️ Hard-capped at 3</td>
            <td style={customTdStyle}>Unlimited ($96/mo add-on)</td>
            <td style={customTdStyle}><strong>Unlimited (Gating Removed)</strong></td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Hide Branding Toggle</td>
            <td style={customTdStyle}>❌ Stripped from Console</td>
            <td style={customTdStyle}>Available (Premium Add-on)</td>
            <td style={customTdStyle}><strong>Available (Gating Removed)</strong></td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>SaaS Upsell / Ads</td>
            <td style={customTdStyle}>Present</td>
            <td style={customTdStyle}>Present</td>
            <td style={customTdStyle}>❌ <strong>Completely Purged</strong></td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>S3 Storage Scope</td>
            <td style={customTdStyle}>Write-Only (PutObject)</td>
            <td style={customTdStyle}>Managed Platform</td>
            <td style={customTdStyle}><strong>Full CRUD with Cleanup</strong></td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Asset Delivery</td>
            <td style={customTdStyle}>Requires public bucket URI</td>
            <td style={customTdStyle}>Cloud CDN</td>
            <td style={customTdStyle}><strong>Secure Local Proxy Routes</strong></td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Session Tracking</td>
            <td style={customTdStyle}>OIDC Session Lifetime</td>
            <td style={customTdStyle}>OIDC Session Lifetime</td>
            <td style={customTdStyle}><strong>Real-Time Heartbeats</strong></td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Password Expiration</td>
            <td style={customTdStyle}>❌ Absent</td>
            <td style={customTdStyle}>❌ Absent</td>
            <td style={customTdStyle}><strong>Full Custom Policies</strong></td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Organization Webhooks</td>
            <td style={customTdStyle}>Standard Payload</td>
            <td style={customTdStyle}>Standard Payload</td>
            <td style={customTdStyle}><strong>Enriched Payload (includes userIds)</strong></td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>Visual Aesthetic</td>
            <td style={customTdStyle}>Stock Purple</td>
            <td style={customTdStyle}>Stock Purple</td>
            <td style={customTdStyle}><strong>Custom Deep Blue Theme</strong></td>
          </tr>
        </tbody>
      </table>

      <h2 id={slugify("Deploying Blacktop via Cloudflare Tunnel")} style={h2Style}>Deploying Blacktop via Cloudflare Tunnel</h2>
      
      <p style={styles.textStyle}>
        To run Logto Blacktop with a PostgreSQL DB, Redis cache, and <strong>RustFS</strong> Object Storage (configured for file assets and user avatars), use the following docker-compose configuration.
      </p>
      <p style={styles.textStyle}>
        <strong>Directory Structure Rule:</strong> Git clone the Logto Blacktop repository into a directory named <code>logto-server</code>. Place this <code>docker-compose.yml</code> and its corresponding <code>.env</code> file <strong>on the same level (as siblings)</strong> as the <code>logto-server</code> directory (NOT inside of it).
      </p>
      
      <CodeBlock title="docker-compose.yml" code={`version: "3.8"

services:
  # Logto Core Service (built from local source)
  logto:
    build:
      context: ./logto-server
      dockerfile: Dockerfile
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rustfs-init:
        condition: service_completed_successfully
    entrypoint: ["sh", "-c", "npm run cli db seed -- --swe && npm run cli db alteration deploy next && npm run cli db system set storageProvider '{\\"provider\\":\\"S3Storage\\",\\"endpoint\\":\\"http://rustfs:9000\\",\\"bucket\\":\\"logto\\",\\"forcePathStyle\\":\\true\\",\\"accessKeyId\\":\\"\${RUSTFS_ACCESS_KEY}\\",\\"accessSecretKey\\":\\"\${RUSTFS_SECRET_KEY}\\"}' && npm start"]
    networks:
      - logto-net
    ports:
      - "3001:3001"  # API endpoint (PORT)
      - "3002:3002"  # Admin console (ADMIN_PORT)
    environment:
      - TRUST_PROXY_HEADER=1
      - DB_URL=postgres://postgres:\${POSTGRES_PASSWORD}@postgres:5432/logto
      - REDIS_URL=redis://redis:6379
      - PORT=3001
      - ENDPOINT=\${LOGTO_ENDPOINT}
      - ADMIN_PORT=3002
      - ADMIN_ENDPOINT=\${LOGTO_ADMIN_ENDPOINT}
      - SMTP_FROM=\${SMTP_FROM}
      - SMTP_HOST=\${SMTP_HOST}
      - SMTP_PORT=\${SMTP_PORT}
      - SMTP_SECURE=\${SMTP_SECURE}
      - SMTP_USER=\${SMTP_USER}
      - SMTP_PASS=\${SMTP_PASS}
      - EMAIL_SERVICE_PROVIDER=nodemailer
    volumes:
      - ./data/logto:/var/lib/logto
      - ./data/connectors:/etc/logto/packages/core/connectors
    restart: unless-stopped

  # RustFS S3-Compatible Object Storage
  rustfs:
    image: rustfs/rustfs:latest
    networks:
      - logto-net
    ports:
      - "3003:9000"
      - "3004:9001"
    environment:
      RUSTFS_ACCESS_KEY: \${RUSTFS_ACCESS_KEY}
      RUSTFS_SECRET_KEY: \${RUSTFS_SECRET_KEY}
    volumes:
      - ./data/rustfs/data:/data
      - ./data/rustfs/logs:/logs
    healthcheck:
      test: ["CMD-SHELL", "wget -qO /dev/null http://localhost:9000/health || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s
    restart: unless-stopped

  # RustFS bucket init - only creates the bucket if it does not already exist
  rustfs-init:
    image: minio/mc:latest
    depends_on:
      rustfs:
        condition: service_healthy
    networks:
      - logto-net
    entrypoint: |
      /bin/sh -c "
      mc alias set rustfs http://rustfs:9000 \${RUSTFS_ACCESS_KEY} \${RUSTFS_SECRET_KEY};
      mc ls rustfs/logto > /dev/null 2>&1 || mc mb rustfs/logto;
      "

  # PostgreSQL Database
  postgres:
    image: postgres:14-alpine
    networks:
      - logto-net
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: logto
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Redis Cache
  redis:
    image: redis:7-alpine
    networks:
      - logto-net
    ports:
      - "6379:6379"
    volumes:
      - ./data/redis:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Cloudflare Tunnel
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run
    networks:
      - logto-net
    environment:
      - TUNNEL_TOKEN=\${CLOUDFLARE_TUNNEL_TOKEN}
    volumes:
      - ./data/cloudflared:/etc/cloudflared
    restart: unless-stopped
    depends_on:
      - logto

volumes: {}

networks:
  logto-net:
    driver: bridge`} />

      <p style={styles.textStyle}>
        An external S3-compatible Object Storage service is only required if you intend to host custom asset files, themes, and user profile pictures. (Upstream OSS disables custom asset storage configurations, so hooking it up is irrelevant there).
      </p>

      <h2 id={slugify("Branding Hiding Hack (OSS Upstream & Cloud)")} style={h2Style}>Branding Hiding Hack (OSS Upstream & Cloud)</h2>
      
      <p style={styles.textStyle}>
        If you are utilizing standard Logto OSS Upstream or a free tier of Logto Cloud, you can hide the default paywalled branding signature by pasting the following CSS snippet directly into your Logto Console custom CSS customization input:
      </p>
      
      <CodeBlock title="Logto Custom CSS Hack" code={`/* Hide Logto signature */
.VPHIq_signature,
.logto_signature,
[data-logto-signature-container="secured"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    height: 0 !important;
    width: 0 !important;
    overflow: hidden !important;
    position: absolute !important;
    pointer-events: none !important;
}`} />
      
      <p style={styles.textStyle}>
        Applying this custom stylesheet is functionally identical to toggling the paid "Remove branding" feature inside Logto.
      </p>
    </div>
  );
}
