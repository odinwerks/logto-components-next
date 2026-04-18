/**
 * Heartbeat Cleanup Integration
 *
 * Provides functions to:
 * - Cleanup expired heartbeats
 * - Clear user heartbeats on sign out/org change
 * - Clear asOrg in Logto when heartbeat expires
 */

'use server';

import { getHeartbeatStore } from '.';
import { updateUserCustomData } from '../actions';

/**
 * Clear expired heartbeats and optionally clear asOrg for affected users
 * Called periodically in memory mode
 */
export async function cleanupExpiredHeartbeats(
  maxAgeMs: number,
  clearAsOrg: boolean = false
): Promise<{ cleared: number; usersAffected: string[] }> {
  const store = getHeartbeatStore();

  // For memory mode: cleanup returns count
  // For Redis mode: this is a no-op (TTL handles it)
  const cleared = await store.cleanup(maxAgeMs);
  const usersAffected: string[] = [];

  if (cleared > 0 && clearAsOrg) {
    // Note: In memory mode, we don't know which users were cleared
    // This would need to be tracked separately if needed
    console.log(`[Heartbeat] Cleaned up ${cleared} expired entries`);
  }

  return { cleared, usersAffected };
}

/**
 * Clear heartbeat for a specific user+org
 * Called when user signs out or switches org
 */
export async function clearUserHeartbeat(
  userId: string,
  orgId?: string | null
): Promise<void> {
  const store = getHeartbeatStore();
  await store.clear(userId, orgId);
}

/**
 * Record heartbeat for a user+org
 * Called when user sets active org
 */
export async function recordHeartbeat(
  userId: string,
  orgId: string | null
): Promise<void> {
  const store = getHeartbeatStore();
  await store.set(userId, orgId, Date.now());
}

/**
 * Check if user has active heartbeat for org
 * Used by Protected API to validate session
 */
export async function hasActiveHeartbeat(
  userId: string,
  orgId: string | null
): Promise<boolean> {
  const store = getHeartbeatStore();
  const lastHeartbeat = await store.get(userId, orgId);
  return lastHeartbeat !== null;
}

/**
 * Clear asOrg for a user in Logto customData
 * Called when heartbeat expires or user signs out
 */
export async function clearAsOrgInLogto(userId: string): Promise<void> {
  try {
    // Update customData to clear asOrg
    // Note: This requires M2M credentials and proper permissions
    await updateUserCustomData({ Preferences: { asOrg: null } });
    console.log(`[Heartbeat] Cleared asOrg for user ${userId}`);
  } catch (error) {
    console.error(`[Heartbeat] Failed to clear asOrg for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Full cleanup for user sign out
 * - Clear all heartbeats for user
 * - Clear asOrg in Logto
 */
export async function cleanupUserOnSignOut(userId: string): Promise<void> {
  // Clear all heartbeats for user
  await clearUserHeartbeat(userId);

  // Clear asOrg in Logto
  await clearAsOrgInLogto(userId);
}
