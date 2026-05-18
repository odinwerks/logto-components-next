import { signIn } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../../logto';

// NOTE: This GET handler intentionally has no origin guard.
// Login CSRF is a low-risk vector here (requires user to click a link while authenticated).
// The server-action `signIn()` is preferred for CSRF-protected flows.
export async function GET() {
  await signIn(getLogtoConfig());
}
