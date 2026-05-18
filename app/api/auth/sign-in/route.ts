import { signIn } from '@logto/next/server-actions';
import { NextRequest, NextResponse } from 'next/server';
import { getLogtoConfig } from '../../../logto';
import { checkSameOrigin } from '../../../logto-kit/logic/origin-guard';

export async function GET(request: NextRequest) {
  const originError = checkSameOrigin(request);
  if (originError) return originError;

  await signIn(getLogtoConfig());
}
