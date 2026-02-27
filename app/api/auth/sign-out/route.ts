import { signOut } from '@logto/next/server-actions';
import { logtoConfig } from '../../../logto';

export async function GET() {
  await signOut(logtoConfig);
}
