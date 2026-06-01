'use client';

import CodeBlock from '../../components/SyntaxBlock';
import { useDocStyles } from '../../components/useDocStyles';
import { SectionWrap } from '../../components/SectionComponents';

export default function ProfileSection() {
  const styles = useDocStyles();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Profile - props">
        <p style={styles.textStyle}>
          The Profile tab handles identity verification and contact management in addition to
          basic profile fields. Contact verification props are shared between Profile and Security tabs.
          All state updates are coordinated via callbacks that interact with the server.
        </p>
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>Prop</th>
              <th style={styles.thStyle}>Type</th>
              <th style={styles.thStyle}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPathStyle}>userData</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>UserData</code></td>
              <td style={styles.tdStyle}>User profile data object containing current profile, email, phone, and avatar fields</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>mode</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>'dark' | 'light'</code></td>
              <td style={styles.tdStyle}>Theme rendering mode (dark or light theme)</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>colors</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>ThemeColors</code></td>
              <td style={styles.tdStyle}>Object containing defined hex color configurations for the active theme</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>t</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>Translations</code></td>
              <td style={styles.tdStyle}>Language translations map loaded from the locale provider</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>mobmode</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>number</code></td>
              <td style={styles.tdStyle}>Mobile responsive layout toggle (1 for mobile layout, other values for desktop)</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>onUpdateBasicInfo</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>({`{name?,username?}`}){`=>`}Promise{`<ActionResult>`}</code></td>
              <td style={styles.tdStyle}>Updates basic display name and username fields on the server</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>onUpdateAvatarUrl</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>(url){`=>`}Promise{`<ActionResult>`}</code></td>
              <td style={styles.tdStyle}>Updates or clears the user avatar URL link on the server</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>onUpdateProfile</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>({`{givenName?,familyName?}`}){`=>`}Promise{`<ActionResult>`}</code></td>
              <td style={styles.tdStyle}>Updates detailed user profile given name and family name fields</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>onVerifyPassword</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>(pw){`=>`}Promise{`<DataResult<{verificationRecordId}>`}</code></td>
              <td style={styles.tdStyle}>Verifies password and returns a one-time verification record ID to authorize changes</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>onSendEmailVerification</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>(email){`=>`}Promise{`<DataResult<{verificationId}>`}</code></td>
              <td style={styles.tdStyle}>Instructs the server to dispatch a verification code to the target email</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>onSendPhoneVerification</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>(phone){`=>`}Promise{`<DataResult<{verificationId}>`}</code></td>
              <td style={styles.tdStyle}>Instructs the server to dispatch a verification code to the target phone number</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>onVerifyCode</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>(type, value, verificationId, code){`=>`}Promise{`<DataResult<{verificationRecordId}>>`}</code></td>
              <td style={styles.tdStyle}>Verifies the user input code and returns a new identifier verification record ID</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>onUpdateEmail</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>(email, newIdentVid, identityVid){`=>`}Promise{`<ActionResult>`}</code></td>
              <td style={styles.tdStyle}>Binds the verified email to the user using the identity and new identifier records</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>onUpdatePhone</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>(phone, newIdentVid, identityVid){`=>`}Promise{`<ActionResult>`}</code></td>
              <td style={styles.tdStyle}>Binds the verified phone to the user using the identity and new identifier records</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>onRemoveEmail</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>(identityVid){`=>`}Promise{`<ActionResult>`}</code></td>
              <td style={styles.tdStyle}>Removes the current primary email address utilizing the identity verification record</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>onRemovePhone</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>(identityVid){`=>`}Promise{`<ActionResult>`}</code></td>
              <td style={styles.tdStyle}>Removes the current primary phone number utilizing the identity verification record</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>onSuccess</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>(msg){`=>`}void</code></td>
              <td style={styles.tdStyle}>Callback to display a success toast message</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>onError</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>(msg){`=>`}void</code></td>
              <td style={styles.tdStyle}>Callback to display an error toast message</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>refreshData</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>{`() => void`}</code></td>
              <td style={styles.tdStyle}>Triggers a router-level refresh to update cached server data shown in the UI</td>
            </tr>
          </tbody>
        </table>
      </SectionWrap>

      <SectionWrap label="Profile - hooks & actions">
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
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>Return</th>
              <th style={styles.thStyle}>Type</th>
              <th style={styles.thStyle}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPathStyle}>upload</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>(file: File){`=>`}Promise{`<string|null>`}</code></td>
              <td style={styles.tdStyle}>Submits file via FormData to server and returns the public file URL on success</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>isUploading</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>boolean</code></td>
              <td style={styles.tdStyle}>Indicates if an upload is currently in progress on the server</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>error</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>string | null</code></td>
              <td style={styles.tdStyle}>Contains the error message if the upload attempt failed</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>clearError</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>(){`=>`}void</code></td>
              <td style={styles.tdStyle}>Resets the error state back to null</td>
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
      </SectionWrap>

      <SectionWrap label="Profile - ImageCropper">
        <p style={styles.textStyle}>
          Canvas-based image cropping component. Supports dragging, zooming, touch pinch gestures,
          rule-of-thirds overlay, and shape masking.
        </p>
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>Prop</th>
              <th style={styles.thStyle}>Type</th>
              <th style={styles.thStyle}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPathStyle}>imageUrl</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>string</code></td>
              <td style={styles.tdStyle}>Source image URL (blob link, data URI, or cross-origin safe URL)</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>shape</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>{`'circle' | 'sq' | 'rsq'`}</code></td>
              <td style={styles.tdStyle}>Cropping viewport shape: circular, square, or rounded square</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>outputSize</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>number</code></td>
              <td style={styles.tdStyle}>Width and height dimensions of the exported image (defaults to 512)</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>displaySize</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>number</code></td>
              <td style={styles.tdStyle}>Rendered physical canvas width and height in pixels (defaults to 180)</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>mode</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>{`'dark' | 'light'`}</code></td>
              <td style={styles.tdStyle}>Active theme mode passed down from parent context</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>colors</td>
              <td style={styles.tdStyle}><code style={styles.codeStyle}>ThemeColors</code></td>
              <td style={styles.tdStyle}>Hex colors configuration map used for drawing tool elements</td>
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
      </SectionWrap>

      <SectionWrap label="Profile - Verification Flows">
        <p style={styles.textStyle}>
          Contact modification operations (such as registering, updating, or deleting email and phone identifiers)
          require identity validation challenges to ensure security. State machines inside the component navigate
          this verification lifecycle.
        </p>
        <p style={styles.textStyle}>
          <strong>Comprehensive Verification Lifecycle:</strong>
        </p>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>1. Initiation and State Management:</span>
          The verification flow is triggered by clicking edit or delete in the ContactRow component.
          It maintains a localized state machine:
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>`modalKind`: Tracks the operation ('edit' to update or add, 'remove' to delete, or null).</li>
            <li>`newValue`: Stores the text input for the email address or phone number.</li>
            <li>`step`: Manages the active modal dialog phase ('password' for challenge, 'loading' for network wait, or 'code' for confirmation).</li>
            <li>`pwErr`: Captures and displays password challenge validation errors.</li>
          </ul>
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>2. Identity Verification (Password Challenge):</span>
          Before any network request is issued to update contact information, the client must verify user identity.
          The user inputs their password, and the modal triggers the onVerifyPassword(pw) callback. On success, the server
          returns a short-lived verification token (identityVerificationId). If password verification fails, the error is
          rendered, and the flow is halted.
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>3. Verification Code Dispatch:</span>
          Once the identity challenge is passed, the client initiates contact code dispatch:
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>In edit mode, it calls onSendVerification(target) which instructs Logto to deliver a 6-digit one-time code to the user's new email or phone number. Logto registers the dispatch record and returns a unique delivery verificationId.</li>
            <li>The client transitions to the code input step, tracking both the password identityVerificationId and the delivery verificationId.</li>
          </ul>
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>4. Code Verification and Account Update:</span>
          The user inputs the 6-digit code. The component calls onVerifyCodeAndUpdate.
          This handles two distinct updates:
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>It first calls onVerifyCode(type, value, verificationId, code) to validate the input code against the delivery verificationId. On success, the server returns a newIdentifierVerificationRecordId.</li>
            <li>It immediately proceeds to submit onUpdateEmail or onUpdatePhone, passing the target identifier value, the newIdentifierVerificationRecordId, and the original identityVerificationId.</li>
            <li>The server commits the change, the client calls refreshData() to fetch the fresh state, and the modal is dismissed.</li>
          </ul>
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>5. Contact Removal Flow:</span>
          Removing an identifier (email or phone) skips code dispatch but still enforces identity verification:
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>The user confirms deletion by submitting their password to onVerifyPassword(pw) to acquire an identityVerificationId.</li>
            <li>The client executes onRemove(identityVerificationId) (mapping to onRemoveEmail or onRemovePhone).</li>
            <li>The server unbinds the contact field from the user account under Logto, triggers refreshData(), and closes the dialog.</li>
          </ul>
        </div>
        <div style={styles.noteStyle}>
          <span style={styles.strongNoteStyle}>6. Error Code and Exception Handling:</span>
          All verification handlers parse error codes returned from the server API. Wrong codes, expired IDs, format issues, and rate-limiting blocks trigger descriptive UI alerts via the onError callback. If a token expires or invalidates, the modal state resets back to the initial password challenge phase to maintain a secure environment.
        </div>
      </SectionWrap>
    </div>
  );
}
