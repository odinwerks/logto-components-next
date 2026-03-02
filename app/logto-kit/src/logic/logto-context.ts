import { getLogtoContext } from '@logto/next/server-actions';
import { redirect } from 'next/navigation';
import { logtoConfig } from '../../../logto';

const STALE_COOKIE_ERROR = 'Cookies can only be modified';

export async function safeGetLogtoContext(fetchUserInfo = false) {
  try {
    return await getLogtoContext(logtoConfig, { fetchUserInfo });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes(STALE_COOKIE_ERROR)) {
      console.log('[CookieKiller] 🔧 Stale cookies detected in getLogtoContext, redirecting to wipe...');
      redirect('/api/wipe');
    }
    throw error;
  }
}
