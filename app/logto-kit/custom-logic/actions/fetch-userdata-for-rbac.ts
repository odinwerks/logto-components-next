'use server';

import { getLogtoContext, getAccessToken } from '@logto/next/server-actions';
import { logtoConfig } from '../../../logto';

function getCleanEndpoint(): string {
  return logtoConfig.endpoint.replace(/\/$/, '');
}

export async function fetchUserDataForRbac(): Promise<{ 
  asOrg: string | null; 
  organizations: string[];
} | null> {
  try {
    const { claims, isAuthenticated } = await getLogtoContext(logtoConfig);

    if (!isAuthenticated || !claims?.sub) {
      return null;
    }

    // Get token for /oidc/me endpoint
    const accessToken = await getAccessToken(logtoConfig);
    if (!accessToken) {
      return null;
    }

    // Fetch from /oidc/me to get full user data including custom_data
    const cleanEndpoint = getCleanEndpoint();
    const res = await fetch(`${cleanEndpoint}/oidc/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error('[RBAC] Failed to fetch /oidc/me:', await res.text());
      return null;
    }

    const userInfo = await res.json();
    
    const userOrgs = claims.organizations as string[] | undefined;
    const customData = userInfo.custom_data as Record<string, unknown> | undefined;
    const prefs = customData?.Preferences as { asOrg?: string | null } | undefined;
    const asOrg = prefs?.asOrg ?? null;

    return {
      asOrg,
      organizations: userOrgs ?? [],
    };
  } catch (error) {
    console.error('[RBAC] fetchUserDataForRbac error:', error);
    return null;
  }
}
