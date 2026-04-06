'use server';

import { NextResponse } from 'next/server';
import { getOrganizationUserPermissions } from '../../logto-kit/logic/actions';
import { getCleanEndpoint } from '../../logto-kit/logic/utils';
import { getAccessToken } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../logto';

export async function GET() {
  try {
    console.log('[org-permissions API] Starting request');
    // Get user's access token using Logto's getAccessToken
    const token = await getAccessToken(getLogtoConfig(), '');
    if (!token) {
      console.error('[org-permissions API] No access token');
      return NextResponse.json({ error: 'No access token' }, { status: 401 });
    }

    console.log('[org-permissions API] Got access token');

    // Get user info to find active organization
    const cleanEndpoint = await getCleanEndpoint();
    const userInfoRes = await fetch(`${cleanEndpoint}/oidc/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!userInfoRes.ok) {
      console.error('[org-permissions API] Failed to get user info:', userInfoRes.status);
      return NextResponse.json({ error: 'Failed to get user info' }, { status: 500 });
    }

    const userInfo = await userInfoRes.json();
    console.log('[org-permissions API] Got user info:', {
      sub: userInfo.sub,
      organizations: userInfo.organizations,
      custom_data: userInfo.custom_data
    });

    // Get active organization from custom data
    const prefs = userInfo.custom_data?.Preferences;
    const activeOrgId = prefs?.asOrg;

    console.log('[org-permissions API] Preferences:', prefs);
    console.log('[org-permissions API] Active org ID:', activeOrgId);

    if (!activeOrgId) {
      console.log('[org-permissions API] No active organization');
      return NextResponse.json({ permissions: [] });
    }

    // Get organization permissions
    console.log('[org-permissions API] Getting permissions for org:', activeOrgId);
    const permissions = await getOrganizationUserPermissions(activeOrgId);
    console.log('[org-permissions API] Got permissions:', permissions);

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('[org-permissions API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}