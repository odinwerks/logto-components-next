import { signIn } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../../logto';

export async function GET() {
  await signIn(getLogtoConfig());
}
