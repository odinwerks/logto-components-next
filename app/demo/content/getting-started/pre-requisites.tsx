'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function PreRequisites() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Pre-requisites">
        <p style={styles.textStyle}>
          Before setting up this Next.js starter kit, you need a running, accessible instance of <strong>Logto</strong>.
        </p>
        <p style={styles.textStyle}>
          You have three deployment paths depending on your needs. We recommend <strong>self-hosting</strong> as it is straightforward and gives you full control over your customer authentication stack.
        </p>

        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '25%' }}>Option</th>
              <th style={{ ...styles.thStyle, width: '55%' }}>Description & Links</th>
              <th style={{ ...styles.thStyle, width: '20%' }}>Hosted</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>Logto Blacktop</td>
              <td style={styles.tdStyle}>
                An actively maintained fork. It provides premium enterprise features (branding control, custom UI) on the OSS tier, optimizes storage handlers, and provides advanced APIs. Learn more on <a href="https://github.com/odinwerks/logto/tree/master" target="_blank" rel="noopener noreferrer" style={{ color: styles.linkColor, textDecoration: 'underline' }}>GitHub (Blacktop Fork)</a>.
              </td>
              <td style={styles.tdStyle}>Self-hosted</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>Logto OSS</td>
              <td style={styles.tdStyle}>
                The official upstream open-source release. Fully compatible, stable, supports role-based access control (RBAC) and custom social/enterprise connectors, but locks branding hiding and custom UI gates. Check it out on <a href="https://github.com/logto-io/logto" target="_blank" rel="noopener noreferrer" style={{ color: styles.linkColor, textDecoration: 'underline' }}>GitHub (Upstream)</a>.
              </td>
              <td style={styles.tdStyle}>Self-hosted</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>Logto Cloud</td>
              <td style={styles.tdStyle}>
                The official hosted SaaS edition. Rapid configuration, but crucial developer features like organizations, custom branding, and RBAC permissions are gated behind monthly premium subscriptions. Get started at <a href="https://cloud.logto.io" target="_blank" rel="noopener noreferrer" style={{ color: styles.linkColor, textDecoration: 'underline' }}>Logto Cloud Console</a>.
              </td>
              <td style={styles.tdStyle}>SaaS (Hosted)</td>
            </tr>
          </tbody>
        </table>
      </SectionWrap>

      <SectionWrap label="Deep-Dive: How They Differ">
        <p style={styles.textStyle}>
          Here is how the editions compare in technical capability and licensing restrictions:
        </p>
        <ul style={{ ...styles.textStyle, marginLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>
            <strong>Logto Blacktop (The Fork):</strong> Built without licensing restrictions on branding and custom UI. It includes features that upstream OSS does not include, such as:
            <ul style={{ marginLeft: '1rem', marginTop: '4px', listStyleType: 'circle' }}>
              <li><strong>Disable Logto Branding:</strong> Remove watermarks and footers from sign-in interfaces.</li>
              <li><strong>Custom Sign-In/Up UI:</strong> Ability to serve and inject custom HTML/CSS and assets directly within Logto.</li>
              <li><strong>Rich Sessions:</strong> Leverages a custom "Last active at" session tracker to record active audit trails.</li>
              <li><strong>Refactored S3 Backend:</strong> Overhauled S3/RustFS architecture.</li>
              <li><strong>One-Shot Avatar API:</strong> Direct API to post an image and instantly apply/bind it to a user profile picture inside Logto.</li>
            </ul>
          </li>
          <li>
            <strong>Logto OSS (Upstream):</strong> The standard baseline. Full-fat RBAC and connectors are included out of the box, but premium customization experiences (custom UI, brand removal) are blocked, and it lacks the one-shot avatar API or rich sessions.
          </li>
          <li>
            <strong>Logto Cloud:</strong> SaaS-managed convenience. Paywalled RBAC/Organization controls on standard subscriptions. While premium features are technically available, they are locked behind costly monthly plans.
          </li>
        </ul>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>Recommendation:</strong> <strong>Logto Blacktop</strong> is recommended. It receives active updates, implements user audits, and provides custom file-serving APIs.
        </div>
      </SectionWrap>

      <SectionWrap label="What This Means For Setup">
        <p style={styles.textStyle}>
          The components in this dashboard have been designed to leverage Blacktop's premium enhancements when present, with graceful degradation fallbacks:
        </p>
        <ol style={{ ...styles.textStyle, marginLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>
            <strong>Profile Picture Backend:</strong> The integrated <code>logto</code> upload option is exclusive to Blacktop. For Upstream OSS setups, you must configure the external <code>S3</code> or <code>Supabase</code> bucket backends.
          </li>
          <li>
            <strong>Rich Sessions Audit:</strong> Session audit lists will degrade gracefully (without the "Last active at" timestamp) on Upstream OSS or Cloud deployments.
          </li>
          <li>
            <strong>Logto Cloud SaaS:</strong> This dashboard was <strong>NOT</strong> tested on Logto Cloud. Use at your own risk or expect minor OIDC claim discrepancies.
          </li>
        </ol>
      </SectionWrap>

      <SectionWrap label="Deploying Blacktop via Cloudflare Tunnel">
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
      </SectionWrap>

      <SectionWrap label="Branding Hiding Hack (OSS Upstream & Cloud)">
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
      </SectionWrap>
    </div>
  );
}
