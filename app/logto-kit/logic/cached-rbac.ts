import 'server-only';

import { cache } from 'react';
import { fetchPersonalRbacCore, fetchOrgRbacCore } from './rbac-data';

/**
 * Per-request cached versions of the RBAC cores.
 *
 * Wraps plain async functions (NOT Server Actions) with `React.cache`, ensuring
 * true deduplication across multiple RSC callers in the same render pass.
 *
 * Both `Dashboard` and `MobileDashboard` RSCs render server-side on every
 * page (the desktop/mobile shell picks which displays). With these wrappers,
 * both RSCs' `fetchPersonalRbacCached(userId)` calls collapse to ONE personal
 * RBAC fetch, and both RSCs' `fetchOrgRbacCached(userId, orgId)` calls
 * collapse to ONE org RBAC fetch.
 *
 * Also dedupes within each core: the roles GET is shared between the roles
 * list and the scopes fan-out (the cores merge the previously-duplicate
 * `getUserRoles` + `getUserScopes` / `getOrganizationUserRoles` +
 * `getOrgPermissionsWithDescriptions` chains).
 *
 * `React.cache` arg equality:
 *   - `fetchPersonalRbacCached(userId)` dedupes by `userId` (string).
 *   - `fetchOrgRbacCached(userId, orgId)` dedupes by the tuple.
 * Both args are primitive strings (enforced by `assertSafeLogtoId`).
 */
export const fetchPersonalRbacCached = cache(fetchPersonalRbacCore);
export const fetchOrgRbacCached = cache(fetchOrgRbacCore);
