import { signIn } from '@logto/next/server-actions';
import { NextRequest } from 'next/server';
import { getLogtoConfig } from '../../../logto';

export async function GET(request: NextRequest) {
  await signIn(getLogtoConfig());
}
