'use client';

import CodeBlock from '../../components/SyntaxBlock';
import { useDocStyles } from '../../components/useDocStyles';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

export default function ProfileSection() {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 id={slugify("Profile - props")} style={h2Style}>Profile - props</h2>
        <p style={styles.textStyle}>
          The Profile tab handles identity verification and contact management in addition to
          basic profile fields. Contact verification props are shared between Profile and Security tabs.
          All state updates are coordinated via callbacks that interact with the server.
        </p>
        <table style={customTableStyle}>
          <thead>
            <tr>
              <th style={customThStyle}>Prop</th>
              <th style={customThStyle}>Type</th>
              <th style={customThStyle}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={customTdPropStyle}>userData</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>UserData</code></td>
              <td style={customTdStyle}>User profile data object containing current profile, email, phone, and avatar fields</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>mode</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>'dark' | 'light'</code></td>
              <td style={customTdStyle}>Theme rendering mode (dark or light theme)</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>colors</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>ThemeColors</code></td>
              <td style={customTdStyle}>Object containing defined hex color configurations for the active theme</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>t</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>Translations</code></td>
              <td style={customTdStyle}>Language translations map loaded from the locale provider</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>mobmode</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>number</code></td>
              <td style={customTdStyle}>Mobile responsive layout toggle (1 for mobile layout, other values for desktop)</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>onUpdateBasicInfo</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>({`{name?,username?}`}){`=>`}Promise{`<ActionResult>`}</code></td>
              <td style={customTdStyle}>Updates basic display name and username fields on the server</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>onUpdateAvatarUrl</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>(url){`=>`}Promise{`<ActionResult>`}</code></td>
              <td style={customTdStyle}>Updates or clears the user avatar URL link on the server</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>onUpdateProfile</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>({`{givenName?,familyName?}`}){`=>`}Promise{`<ActionResult>`}</code></td>
              <td style={customTdStyle}>Updates detailed user profile given name and family name fields</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>onVerifyPassword</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>(pw){`=>`}Promise{`<DataResult<{verificationRecordId, verificationTimestamp}>`}</code></td>
              <td style={customTdStyle}>Verifies password and returns verification ID plus server timestamp</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>onSendEmailVerification</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>(email){`=>`}Promise{`<DataResult<{verificationId}>`}</code></td>
              <td style={customTdStyle}>Instructs the server to dispatch a verification code to the target email</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>onSendPhoneVerification</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>(phone){`=>`}Promise{`<DataResult<{verificationId}>`}</code></td>
              <td style={customTdStyle}>Instructs the server to dispatch a verification code to the target phone number</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>onVerifyCode</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>(type, value, verificationId, code){`=>`}Promise{`<DataResult<{verificationRecordId}>>`}</code></td>
              <td style={customTdStyle}>Verifies the user input code and returns a new identifier verification record ID</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>onUpdateEmail</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>(email, newIdentVid, identityVid, verificationTimestamp){`=>`}Promise{`<ActionResult>`}</code></td>
              <td style={customTdStyle}>Binds the verified email using both verification IDs and timestamp</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>onUpdatePhone</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>(phone, newIdentVid, identityVid, verificationTimestamp){`=>`}Promise{`<ActionResult>`}</code></td>
              <td style={customTdStyle}>Binds the verified phone using both verification IDs and timestamp</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>onRemoveEmail</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>(identityVid, verificationTimestamp){`=>`}Promise{`<ActionResult>`}</code></td>
              <td style={customTdStyle}>Removes the current primary email with identity verification and timestamp</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>onRemovePhone</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>(identityVid, verificationTimestamp){`=>`}Promise{`<ActionResult>`}</code></td>
              <td style={customTdStyle}>Removes the current primary phone with identity verification and timestamp</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>onSuccess</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>(msg){`=>`}void</code></td>
              <td style={customTdStyle}>Callback to display a success toast message</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>onError</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>(msg){`=>`}void</code></td>
              <td style={customTdStyle}>Callback to display an error toast message</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>refreshData</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>{`() => void`}</code></td>
              <td style={customTdStyle}>Triggers a router-level refresh to update cached server data shown in the UI</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h2 id={slugify("Profile - hooks & actions")} style={h2Style}>Profile - hooks & actions</h2>
        <p style={styles.textStyle}>
          The client-side profile UI leverages a specialized hook to handle avatar file preparation and transfer.
          This delegates authorization to the server to prevent exposure of storage bucket credentials or access tokens.
        </p>
        <CodeBlock title="useAvatarUpload hook" code={`import { useAvatarUpload } from 'logto-kit';

const { upload, isUploading, error, clearError } = useAvatarUpload({
  onSuccess: async (url) => {
    // The Server Action handles direct database persistence
    // if the selected PFP backend is set to Logto.
    if (process.env.PFP_BACKEND !== 'logto') {
      await updateAvatarUrl(url); // Updates server database with custom storage link
    }
    onSuccess(t.profile.avatarUpdated);
    refreshData();
  },
  onError: (msg) => onError(msg),
});

// Executed from a file picker change or drag-and-drop handler:
// const handleSelect = async (file) => { await upload(file); };`} />
        <table style={customTableStyle}>
          <thead>
            <tr>
              <th style={customThStyle}>Return</th>
              <th style={customThStyle}>Type</th>
              <th style={customThStyle}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={customTdPropStyle}>upload</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>(file: File){`=>`}Promise{`<string|null>`}</code></td>
              <td style={customTdStyle}>Submits file via FormData to server and returns the public file URL on success</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>isUploading</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>boolean</code></td>
              <td style={customTdStyle}>Indicates if an upload is currently in progress on the server</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>error</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>string | null</code></td>
              <td style={customTdStyle}>Contains the error message if the upload attempt failed</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>clearError</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>(){`=>`}void</code></td>
              <td style={customTdStyle}>Resets the error state back to null</td>
            </tr>
          </tbody>
        </table>
        
        <p style={styles.textStyle}>
          <strong>Upload Hook Server Lifecycle:</strong>
        </p>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>1. Safe Envelope Transport:</span> The hook receives a raw File object and packs it in a FormData object using the key 'file'. It calls the uploadAvatar Server Action. Next.js enforces same-origin validation automatically. No access tokens or S3 keys are transmitted from the browser.
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>2. Authorization and Rate Limiting:</span> The Server Action extracts and validates the session cookie to identify the user ID. It enforces a strict rate limit of up to 5 uploads per user per minute. Stale rate-limiting timestamps in memory are cleaned up every 5 minutes.
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>3. Verification and File Checks:</span> The server validates that the file size does not exceed 2 MB. It checks that the declared MIME type resides on the allowlist (jpeg, png, webp, gif). Additionally, it inspects the physical magic-bytes signature of the file buffer to prevent MIME type spoofing.
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>4. Storage Backend Selection:</span>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>If the PFP_BACKEND environment variable is set to 'logto', the server issues an authorized POST request directly to the Logto Management API endpoint (/api/my-account/avatar) to persist the avatar.</li>
            <li>Otherwise, it defaults to S3-compatible storage. It uploads the buffer using the target path structure {"{userId}/you.{ext}"} to the bucket specified in S3_BUCKET_NAME.</li>
            <li>If SUPABASE_SERVICE_ROLE_KEY is defined, it routes requests via Supabase Storage REST API. Otherwise, it establishes a connection using the MinIO client to put the object.</li>
            <li>Upon successful S3 upload, the server executes a delete operation to clean up obsolete files of different image formats under the user folder, publishes a server audit event (avatar.upload), and appends a query string cache buster (?v=timestamp) to bypass aggressive browser caching.</li>
          </ul>
        </div>

        <p style={styles.textStyle}>
          <strong>Initials Fallback System:</strong>
        </p>
        <div style={styles.noteStyle}>
          When a user has no avatar set or the image failing callback is triggered, the UserBadge displays fallback text computed via getInitials(userData):
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>If givenName and familyName exist, it extracts and capitalizes their first characters (e.g., "John Doe" becomes "JD").</li>
            <li>If givenName and familyName are missing, but the name field is present, it splits the name by spaces and takes the first character of the first two words capitalized.</li>
            <li>If only a username exists, it capitalizes the first character of the username.</li>
            <li>If none of those fields are available, it displays "?".</li>
          </ul>
        </div>
      </div>

      <div>
        <h2 id={slugify("Profile - ImageCropper")} style={h2Style}>Profile - ImageCropper</h2>
        <p style={styles.textStyle}>
          Canvas-based image cropping component. Supports dragging, zooming, touch pinch gestures,
          rule-of-thirds overlay, and shape masking.
        </p>
        <table style={customTableStyle}>
          <thead>
            <tr>
              <th style={customThStyle}>Prop</th>
              <th style={customThStyle}>Type</th>
              <th style={customThStyle}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={customTdPropStyle}>imageUrl</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>string</code></td>
              <td style={customTdStyle}>Source image URL (blob link, data URI, or cross-origin safe URL)</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>shape</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>{`'circle' | 'sq' | 'rsq'`}</code></td>
              <td style={customTdStyle}>Cropping viewport shape: circular, square, or rounded square</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>outputSize</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>number</code></td>
              <td style={customTdStyle}>Width and height dimensions of the exported image (defaults to 512)</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>displaySize</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>number</code></td>
              <td style={customTdStyle}>Rendered physical canvas width and height in pixels (defaults to 180)</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>mode</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>{`'dark' | 'light'`}</code></td>
              <td style={customTdStyle}>Active theme mode passed down from parent context</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>colors</td>
              <td style={customTdStyle}><code style={styles.codeStyle}>ThemeColors</code></td>
              <td style={customTdStyle}>Hex colors configuration map used for drawing tool elements</td>
            </tr>
          </tbody>
        </table>
        <CodeBlock title="Ref interface" code={`export interface ImageCropperRef {
  cropToBlob: () => Promise<Blob | null>;
}

// Usage inside the upload modal:
const cropperRef = useRef<ImageCropperRef>(null);
const blob = await cropperRef.current?.cropToBlob(); // Returns PNG Blob`} />
        
        <p style={styles.textStyle}>
          <strong>Mathematical Rendering and Drag-Pan Mechanics:</strong>
        </p>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>1. Coordinate Offsets and Centering:</span> The logical Canvas dimension is hardcoded to 512px (CANVAS_SIZE) and the cropping frame dimension is 460px (CROP_SIZE). The centering offsets are computed as:
          <code style={{ ...styles.codeSmStyle, display: 'block', margin: '4px 0' }}>
            CROP_X = CROP_Y = (512 - 460) / 2 = 26px
          </code>
          The coordinate position (x, y) where the image is painted onto the canvas is:
          <code style={{ ...styles.codeSmStyle, display: 'block', margin: '4px 0' }}>
            x = CROP_X + (CROP_SIZE - imgW) / 2 + offset.x
            <br />
            y = CROP_Y + (CROP_SIZE - imgH) / 2 + offset.y
          </code>
          where imgW and imgH are the scaled dimensions of the source image.
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>2. Zoom Bounds:</span> The minimum initial scale (minScale) is calculated to guarantee that the image completely covers the cropping area:
          <code style={{ ...styles.codeSmStyle, display: 'block', margin: '4px 0' }}>
            minScale = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight) * 0.95
          </code>
          The maximum scale limit is constrained to minScale * 3.
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>3. Boundary Clamping and Overscroll Damping:</span> Panning offsets are translated to canvas units relative to the bounding box dimension. The maximum permissible offsets are:
          <code style={{ ...styles.codeSmStyle, display: 'block', margin: '4px 0' }}>
            maxX = Math.max(0, (imgW - CROP_SIZE) / 2)
            <br />
            maxY = Math.max(0, (imgH - CROP_SIZE) / 2)
          </code>
          If the drag position rawOffset exceeds maxX or maxY, overscroll damping is applied (OVERSCROLL_DAMPING = 0.3):
          <code style={{ ...styles.codeSmStyle, display: 'block', margin: '4px 0' }}>
            offset = clamped + (rawOffset - clamped) * 0.3
          </code>
          On mouse release or touch end, a snapping spring animation uses cubic ease-out interpolation (1 - (1 - t)^3) over a SNAP_DURATION of 200 milliseconds via requestAnimationFrame to snap the image back into clamp boundaries.
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>4. Custom Crop Viewport Masks:</span> The component paints the view using Canvas 2D composite operations:
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>It fills the 512x512 canvas with a semi-transparent black layer (rgba(0, 0, 0, 0.6)).</li>
            <li>Sets globalCompositeOperation to 'destination-out' and draws the shape mask, cutting out the inner window.</li>
            <li>Reverts globalCompositeOperation to 'source-over', strokes a solid border (rgba(255, 255, 255, 0.7)), and draws dashed rule-of-thirds alignment lines.</li>
            <li>Supported masks: Circle (arc at 256, 256 with radius 230), Square (rect at 26, 26 with size 460x460), or Rounded Square (roundRect at 26, 26 with corner radius 92).</li>
          </ul>
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>5. Offscreen Canvas Blob Generation:</span> When cropToBlob() is called, an offscreen HTMLCanvasElement is created at outputSize (defaults to 512px). A scale factor is calculated (scaleFactor = outputSize / CROP_SIZE). The image is drawn with scaled coordinate offsets:
          <code style={{ ...styles.codeSmStyle, display: 'block', margin: '4px 0' }}>
            x = (outputSize - imgW) / 2 + clampedOffset.x * scaleFactor
            <br />
            y = (outputSize - imgH) / 2 + clampedOffset.y * scaleFactor
          </code>
          Finally, the canvas is serialized to a PNG file using canvas.toBlob() at 92% quality and resolved to a Promise.
        </div>
      </div>

      <div>
        <h2 id={slugify("Profile - Verification Flows")} style={h2Style}>Profile - Verification Flows</h2>
        <p style={styles.textStyle}>
          Contact updates and removals use a strict modal flow with server verification.
        </p>
        <p style={styles.textStyle}>
          <strong>Comprehensive Verification Lifecycle:</strong>
        </p>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>1. Modal sequence:</span>
          Edit mode follows a strict order:
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li><code style={styles.codeSmStyle}>value</code>: User enters the new email or phone value.</li>
            <li><code style={styles.codeSmStyle}>password</code>: User verifies identity with password.</li>
            <li><code style={styles.codeSmStyle}>code</code>: User enters the 6-digit verification code.</li>
          </ul>
          Component state includes:
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>`modalKind`: Tracks the operation ('edit' to update or add, 'remove' to delete, or null).</li>
            <li>`newValue`: Stores the text input for the email address or phone number.</li>
            <li>`step`: Active modal step.</li>
            <li>`pwErr`: Captures and displays password challenge validation errors.</li>
          </ul>
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>2. Password verification:</span>
          <code style={styles.codeSmStyle}>onVerifyPassword(pw)</code> returns <code style={styles.codeSmStyle}>verificationRecordId</code> and <code style={styles.codeSmStyle}>verificationTimestamp</code>.
          The timestamp is required in later update and remove requests.
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>3. Code dispatch:</span>
          In edit mode, after password verification:
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li><code style={styles.codeSmStyle}>onSendVerification(target)</code> sends a 6-digit code and returns <code style={styles.codeSmStyle}>verificationId</code>.</li>
            <li>The modal moves to the <code style={styles.codeSmStyle}>code</code> step with destination, verification IDs, and timestamp.</li>
          </ul>
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>4. Code verification and update:</span>
          <code style={styles.codeSmStyle}>onVerifyCodeAndUpdate</code> runs this sequence:
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>Verify code with <code style={styles.codeSmStyle}>onVerifyCode(type, value, verificationId, code)</code>.</li>
            <li>Call <code style={styles.codeSmStyle}>onUpdateEmail</code> or <code style={styles.codeSmStyle}>onUpdatePhone</code> with new identifier verification ID, identity verification ID, and <code style={styles.codeSmStyle}>verificationTimestamp</code>.</li>
            <li>Refresh UI data and close the modal.</li>
          </ul>
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>5. Contact Removal Flow:</span>
          Removal skips code dispatch but still requires password verification:
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>Get <code style={styles.codeSmStyle}>identityVerificationId</code> and <code style={styles.codeSmStyle}>verificationTimestamp</code> from <code style={styles.codeSmStyle}>onVerifyPassword</code>.</li>
            <li>Call <code style={styles.codeSmStyle}>onRemove(identityVerificationId, verificationTimestamp)</code>.</li>
            <li>Refresh UI data and close the modal.</li>
          </ul>
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>6. Error Code and Exception Handling:</span>
          Verification errors are surfaced through <code style={styles.codeSmStyle}>onError</code>. On failure, the modal returns to the password step.
        </div>
      </div>
    </div>
  );
}
