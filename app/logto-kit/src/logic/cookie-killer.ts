import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const STALE_ERROR = 'Cookies can only be modified in a Server Action or Route Handler';
const WIPE_FLAG = 'WipedCookie';

/**
 * Reads cookies safely. If stale context detected, redirects to trigger wipe via middleware.
 * If WipedCookie exists, logs recovery and cleans it up.
 */
export async function safeCookies() {
  try {
    const store = await cookies();
    
    // Check for recovery flag from previous wipe
    if (store.get(WIPE_FLAG)) {
      console.log('[CookieKiller] Had to wipe cookies in previous session');
      store.set(WIPE_FLAG, '', { maxAge: 0, path: '/' });
    }
    
    return store;
  } catch (e) {
    if (e instanceof Error && e.message.includes(STALE_ERROR)) {
      // Stale context - redirect to trigger wipe via middleware
      redirect('/?wipe=1');
    }
    throw e;
  }
}

/**
 * Middleware helper: Wipes all cookies and sets WipedCookie flag
 * Call this from middleware when ?wipe=1 query parameter is present
 */
export function wipeCookiesInMiddleware(request: NextRequest, response: NextResponse) {
  // Kill all existing cookies
  request.cookies.getAll().forEach(cookie => {
    response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' });
  });
  
  // Set flag so next session knows we wiped
  response.cookies.set(WIPE_FLAG, Date.now().toString(), { path: '/' });
  
  return response;
}

/**
 * API Route Handler: POST /api/wipe (optional - for backward compatibility)
 * Wipes all cookies, sets WipedCookie flag for next session
 */
export async function wipeHandler() {
  const store = await cookies();
  
  // Kill all existing cookies
  store.getAll().forEach(c => {
    store.set(c.name, '', { maxAge: 0, path: '/' });
  });
  
  // Set flag so next session knows we wiped
  store.set(WIPE_FLAG, Date.now().toString(), { path: '/' });
  
  return NextResponse.json({ ok: true });
}