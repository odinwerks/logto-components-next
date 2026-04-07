import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@logto/next/server-actions';
import { getLogtoConfig, getManagementApiToken } from '@/app/logto';
import { getCleanEndpoint } from '@/app/logto-kit/logic/utils';

interface PreferenceUpdateRequest {
  theme?: 'dark' | 'light';
  lang?: string;
  asOrg?: string | null;
}

function apiError(error: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error, message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body: PreferenceUpdateRequest = await request.json();

    if (!body || Object.keys(body).length === 0) {
      return apiError('NO_FIELDS', 'At least one preference field (theme, lang, asOrg) is required', 400);
    }

    const { theme, lang, asOrg } = body;

    if (theme && !['dark', 'light'].includes(theme)) {
      return apiError('INVALID_THEME', 'Theme must be "dark" or "light"', 400);
    }

    if (lang && typeof lang !== 'string') {
      return apiError('INVALID_LANG', 'Lang must be a string', 400);
    }

    if (asOrg !== undefined && asOrg !== null && typeof asOrg !== 'string') {
      return apiError('INVALID_ORG', 'asOrg must be a string or null', 400);
    }

    const userToken = await getAccessToken(getLogtoConfig(), '');
    if (!userToken) {
      return apiError('NO_TOKEN', 'No access token available', 401);
    }

    const cleanEndpoint = await getCleanEndpoint();
    const userInfoRes = await fetch(`${cleanEndpoint}/oidc/me`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    if (!userInfoRes.ok) {
      return apiError('USER_INFO_FAILED', 'Failed to get user info', 500);
    }

    const userInfo = await userInfoRes.json();
    const userId = userInfo.sub;

    if (!userId) {
      return apiError('NO_USER_ID', 'Could not determine user ID', 500);
    }

    const existingCustomData = (userInfo.custom_data as Record<string, unknown>) || {};
    const existingPrefs = (existingCustomData.Preferences as Record<string, unknown>) || {};

    const newPrefs = {
      theme: theme ?? existingPrefs.theme ?? 'dark',
      lang: lang ?? existingPrefs.lang ?? 'en-US',
      asOrg: asOrg !== undefined ? asOrg : (existingPrefs.asOrg ?? null),
    };

    const updatedCustomData = {
      ...existingCustomData,
      Preferences: newPrefs,
    };

    const mgmtToken = await getManagementApiToken();
    const patchRes = await fetch(`${cleanEndpoint}/api/users/${userId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${mgmtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customData: updatedCustomData }),
    });

    if (!patchRes.ok) {
      const errorText = await patchRes.text();
      return apiError('PATCH_FAILED', `Failed to update preferences: ${errorText}`, 500);
    }

    return NextResponse.json({ ok: true, preferences: newPrefs });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return apiError('INTERNAL_ERROR', message, 500);
  }
}
