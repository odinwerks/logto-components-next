/**
 * Heartbeat API Endpoint
 *
 * Receives heartbeat pings from client to keep session alive.
 * Records timestamp in store (memory or Redis based on config).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHeartbeatStore } from '@/app/logto-kit/logic/heartbeat';
import { introspectToken } from '@/app/logto-kit/custom-actions/validation';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { token, orgId } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'MISSING_TOKEN', message: 'Token is required' },
        { status: 401 }
      );
    }

    // Introspect token to verify it's active and get user ID
    const introspection = await introspectToken(token);

    if (!introspection.active) {
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'Token is not active' },
        { status: 401 }
      );
    }

    const userId = introspection.sub;

    if (!userId) {
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'Token missing subject claim' },
        { status: 401 }
      );
    }

    // Record heartbeat
    const store = getHeartbeatStore();
    await store.set(userId, orgId ?? null, Date.now());

    return NextResponse.json({
      success: true,
      userId,
      orgId: orgId ?? null,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[Heartbeat API] Error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
