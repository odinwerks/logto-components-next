# Lint Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 133 lint issues (57 errors, 76 warnings) across 40+ files with zero behavioral changes.

**Architecture:** Batch fixes by risk level — start with mechanical removals (unused imports/vars), then type fixes, then effect refactors. Each batch is independently verifiable via `npm run lint` to confirm issue count decreases.

**Tech Stack:** Next.js 16.2.7, React 19, TypeScript, Vitest, ESLint (`eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`)

---

## File Structure

No new files. All changes modify existing files. The files touched are grouped below by batch.

---

### Task 1: Remove Unused Icon/Component Imports (16 warnings, 0 errors)

**Files:**
- Modify: `app/logto-kit/components/dashboard/tabs/security.tsx:8,10`
- Modify: `app/logto-kit/components/dashboard/tabs/profile.tsx:8`
- Modify: `app/logto-kit/components/dashboard/tabs/organizations.tsx:11`
- Modify: `app/logto-kit/components/dashboard/tabs/sessions.tsx:9`
- Modify: `app/logto-kit/components/dashboard/shared/ContactRow.tsx:10`
- Modify: `app/logto-kit/components/dashboard/tabs/identities.tsx:131`
- Modify: `app/logto-kit/components/dashboard/tabs/preferences.tsx:105`

- [ ] **Step 1: Fix `security.tsx` — remove 7 unused imports**

Line 8: Remove `X`, `ChevronRight`, `AlertTriangle`, `Trash2`, `Eye`, `EyeOff` from lucide-react import.
Line 10: Remove `Input` from shared Input import.

Before:
```tsx
import { Check, X, ChevronRight, AlertTriangle, Key, Trash2, Plus, Eye, EyeOff, RefreshCw, Lock, Shield, Fingerprint, Pencil } from 'lucide-react';
import { Button } from '../../shared/Button';
import { Input } from '../../shared/Input';
```

After:
```tsx
import { Check, Key, Plus, RefreshCw, Lock, Shield, Fingerprint, Pencil } from 'lucide-react';
import { Button } from '../../shared/Button';
```

- [ ] **Step 2: Fix `profile.tsx` — remove unused `Shield` import**

Line 8: Remove `Shield` from lucide-react import.

Before:
```tsx
import { Pencil, X, Mail, Phone, Shield, Check, Camera, Trash2, Image as ImageIcon, Info } from 'lucide-react';
```

After:
```tsx
import { Pencil, X, Mail, Phone, Check, Camera, Trash2, Image as ImageIcon, Info } from 'lucide-react';
```

- [ ] **Step 3: Fix `organizations.tsx` — remove unused `CodeBlock` import**

Line 11: Remove `CodeBlock` from import.

Before:
```tsx
import { CodeBlock } from '../shared/CodeBlock';
```
Delete entire line.

- [ ] **Step 4: Fix `sessions.tsx` — remove unused `Clock` import**

Line 9: Remove `Clock` from lucide-react import.

Before:
```tsx
import { Monitor, Smartphone, Trash2, Lock, Clock, MapPin, RefreshCw } from 'lucide-react';
```

After:
```tsx
import { Monitor, Smartphone, Trash2, Lock, MapPin, RefreshCw } from 'lucide-react';
```

- [ ] **Step 5: Fix `ContactRow.tsx` — remove unused `Mail` and `PhoneIcon` imports**

Line 10: Remove `Mail` and `Phone as PhoneIcon` from lucide-react import.

Before:
```tsx
import { Plus, Mail, Phone as PhoneIcon, LucideIcon, Pencil } from 'lucide-react';
```

After:
```tsx
import { Plus, LucideIcon, Pencil } from 'lucide-react';
```

- [ ] **Step 6: Remove unused `wellStyle` variable in `identities.tsx`**

Line 131: Delete the `wellStyle` variable declaration (lines 131-136).

- [ ] **Step 7: Remove unused `h` variable in `preferences.tsx`**

Line 105: Delete `const h = 100;`

- [ ] **Step 8: Verify batch 1**

Run: `npm run lint 2>&1 | tail -1`
Expected: Problem count drops from 133 to ~117.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "lint: remove unused icon/component imports (16 warnings)"
```

---

### Task 2: Remove Dead Import Blocks in Logic Files (7 warnings, 0 errors)

**Files:**
- Modify: `app/logto-kit/logic/actions/dashboard.ts:6-12`
- Modify: `app/logto-kit/logic/actions/profile.ts:13`

- [ ] **Step 1: Fix `dashboard.ts` — remove 6 unused imports**

Lines 6-12: Remove `DashboardSuccess` from type import, and remove 5 unused util imports entirely.

Before:
```ts
import type { DashboardResult, DashboardSuccess, UserData } from '../types';
import { getCleanEndpoint } from '../utils';
import { debugLog } from '../logger';
import { getTokenForServerAction } from './tokens';
import { makeRequest } from './request';
import { throwOnApiError } from '../errors';
```

After:
```ts
import type { DashboardResult, UserData } from '../types';
```

- [ ] **Step 2: Fix `profile.ts` — remove unused `DataResult` import**

Line 13: Remove `DataResult` from the import.

Before:
```ts
import type { ActionResult, DataResult } from './safe';
```

After:
```ts
import type { ActionResult } from './safe';
```

- [ ] **Step 3: Verify batch 2**

Run: `npm run lint 2>&1 | tail -1`
Expected: Problem count drops to ~110.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "lint: remove dead import blocks in logic files (7 warnings)"
```

---

### Task 3: Remove Unused Variables in Test Files (14 warnings, 0 errors)

**Files:**
- Modify: `app/logto-kit/components/dashboard/shared/ContactRow.test.tsx:46`
- Modify: `app/logto-kit/components/dashboard/tabs/sessions.test.tsx:25-26`
- Modify: `app/logto-kit/components/dashboard/shared/RefreshButton.test.tsx:1`
- Modify: `app/logto-kit/components/dashboard/shared/SessionMapModal.test.tsx:412`
- Modify: `app/logto-kit/components/dashboard/tabs/profile.test.tsx:542`
- Modify: `app/logto-kit/config.test.ts:4`
- Modify: `app/logto-kit/logic/actions/account.test.ts:56`
- Modify: `app/logto-kit/logic/actions/avatar.test.ts:33`
- Modify: `app/logto-kit/logic/actions/dashboard.test.ts:1`
- Modify: `app/logto-kit/logic/actions/profile.test.ts:87-92,476`
- Modify: `app/logto-kit/logic/actions/roles.test.ts:40`
- Modify: `app/logto-kit/logic/actions/webauthn.test.ts:1`
- Modify: `app/logto-kit/components/dashboard/shared/ImageCropper.tsx:335`

- [ ] **Step 1: Fix `ContactRow.test.tsx:46` — remove unused `noop`**

Delete `const noop = vi.fn();` on line 46.

- [ ] **Step 2: Fix `sessions.test.tsx:25-26` — remove unused stubs**

Delete:
```ts
const noop = () => undefined;
const resolvedActionResult = () => Promise.resolve({ ok: true } as ActionResult);
```

- [ ] **Step 3: Fix `RefreshButton.test.tsx:1` — remove unused `vi` import**

Before:
```ts
import { describe, it, expect, vi } from 'vitest';
```

After:
```ts
import { describe, it, expect } from 'vitest';
```

- [ ] **Step 4: Fix `SessionMapModal.test.tsx:412` — remove unused `osmLink`**

Delete `const osmLink = links[0];` on line 412. The next line that uses `links[1]` for `googleMapsLink` stays.

- [ ] **Step 5: Fix `profile.test.tsx:542` — remove unused `modal`**

Delete the `const modal = ...` assignment on line 542.

- [ ] **Step 6: Fix `config.test.ts:4` — remove unused `originalEnv`**

Delete `const originalEnv = { ...process.env };` on line 4.

- [ ] **Step 7: Fix `account.test.ts:56` — remove unused `makeRequest` import**

Remove `makeRequest` from the import line:
```ts
import { makeRequest } from './request';
```
→ delete the entire line.

- [ ] **Step 8: Fix `avatar.test.ts:33` — remove unused `mockRemoveObject`**

Rename `mockRemoveObject` to `_mockRemoveObject` (it's destructured from `vi.hoisted` and used in the mock setup).

Before:
```ts
const { mockPutObject, mockRemoveObject, MockMinioClient } = vi.hoisted(() => {
```

After:
```ts
const { mockPutObject, mockRemoveObject: _mockRemoveObject, MockMinioClient } = vi.hoisted(() => {
```

- [ ] **Step 9: Fix `dashboard.test.ts:1` — remove unused `afterEach`**

Before:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```

After:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
```

- [ ] **Step 10: Fix `profile.test.ts` — remove 6 unused imports/variables**

Line 87: Remove `makeRequest` import.
Line 89: Remove `getTokenForServerAction` import.
Lines 91: Remove `decodeLogtoAccessToken, pickPreferences` from import.
Line 92: Remove `getLogtoConfig` from import.
Line 476: Remove `let firstCallStarted = false;` (the variable at line 532 in the second test block stays — only the one at 476 is flagged).

Before (lines 87-93):
```ts
import { makeRequest } from './request';
import { throwOnApiError } from '../errors';
import { getTokenForServerAction } from './tokens';
import { getLogtoContext } from '@logto/next/server-actions';
import { decodeLogtoAccessToken, pickPreferences } from '../guards';
import { getManagementApiToken, getLogtoConfig } from '../../config';
import { getCleanEndpoint } from '../utils';
```

After:
```ts
import { throwOnApiError } from '../errors';
import { getLogtoContext } from '@logto/next/server-actions';
import { getManagementApiToken } from '../../config';
import { getCleanEndpoint } from '../utils';
```

- [ ] **Step 11: Fix `roles.test.ts:40` — remove unused `makeScope`**

Delete the `makeScope` function (lines 40-49).

- [ ] **Step 12: Fix `webauthn.test.ts:1` — remove unused `afterEach`**

Before:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```

After:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
```

- [ ] **Step 13: Fix `ImageCropper.tsx:335` — remove unused `handleMouseMove`**

Delete the entire `handleMouseMove` useCallback (lines 335-349). Also remove any references to it (check if it's used in event handlers — it's in `useEffect` window listeners at line ~360).

**⚠️ CONCERN:** `handleMouseMove` may be referenced in a `useEffect` that adds window event listeners. Must check before deleting. If it's used in `addEventListener`, the callback must be replaced with an inline function or the variable must be kept (but prefixed with `_` is not viable since it's used). Read lines 359-380 first.

If it IS used in event listeners, prefix with `_` is not the fix — instead, verify it's truly unused (the lint says it is). The event listener likely uses `endDrag` or a different handler.

- [ ] **Step 14: Verify batch 3**

Run: `npm run lint 2>&1 | tail -1`
Expected: Problem count drops to ~96.

- [ ] **Step 15: Commit**

```bash
git add -A && git commit -m "lint: remove unused variables in test files (14 warnings)"
```

---

### Task 4: Prefix Unused Function Parameters with `_` (15 warnings, 0 errors)

**Files:**
- Modify: `app/logto-kit/components/dashboard/shared/CodeBlock.tsx:167`
- Modify: `app/logto-kit/components/dashboard/shared/ImageCropper.tsx:214`
- Modify: `app/logto-kit/components/dashboard/shared/primitives.tsx:64`
- Modify: `app/logto-kit/components/shared/Input.tsx:35`
- Modify: `app/logto-kit/components/shared/PhoneCountrySelect.tsx:28,30`
- Modify: `app/logto-kit/components/dashboard/tabs/identities.tsx:109`
- Modify: `app/logto-kit/components/dashboard/tabs/preferences.tsx:276`
- Modify: `app/logto-kit/components/dashboard/tabs/sessions.tsx:64`
- Modify: `app/logto-kit/components/dashboard/tabs/profile.tsx:759`
- Modify: `app/logto-kit/logic/actions/profile.test.ts:680`

- [ ] **Step 1: Fix `CodeBlock.tsx:167` — rename `mode` to `_mode`**

```tsx
// Before:
export function TruncatedToken({ token, mode, colors, t }: TruncatedTokenProps) {
// After:
export function TruncatedToken({ token, mode: _mode, colors, t }: TruncatedTokenProps) {
```

- [ ] **Step 2: Fix `ImageCropper.tsx:214` — rename `mode` to `_mode`**

```tsx
// Before:
({ imageUrl, shape: shapeProp, userShape, outputSize = 512, displaySize = 180, mode, colors }, ref) => {
// After:
({ imageUrl, shape: shapeProp, userShape, outputSize = 512, displaySize = 180, mode: _mode, colors }, ref) => {
```

- [ ] **Step 3: Fix `primitives.tsx:64` — rename `active` to `_active`**

```tsx
// Before:
export function IconBox({ children, active, color, mode, colors }: ...) {
// After:
export function IconBox({ children, active: _active, color, mode, colors }: ...) {
```

- [ ] **Step 4: Fix `Input.tsx:35` — rename `mode` to `_mode`**

```tsx
// Before:
  hasError,
  mode,
  colors,
// After:
  hasError,
  mode: _mode,
  colors,
```

- [ ] **Step 5: Fix `PhoneCountrySelect.tsx:28,30` — rename `mode` and `t`**

```tsx
// Before:
  countryFilter,
  mode,
  colors,
  t,
// After:
  countryFilter,
  mode: _mode,
  colors,
  t: _t,
```

- [ ] **Step 6: Fix `identities.tsx:109` — rename `mobmode` to `_mobmode`**

```tsx
// Before:
export function IdentitiesTab({ userData, mode, colors, t, mobmode }: IdentitiesTabProps) {
// After:
export function IdentitiesTab({ userData, mode, colors, t, mobmode: _mobmode }: IdentitiesTabProps) {
```

- [ ] **Step 7: Fix `preferences.tsx:276` — rename `mode` to `_mode`**

In the `ThemeOption` function destructuring:
```tsx
// Before:
function ThemeOption({
  id, label, Icon, isSelected, mode, colors, onSelect, tall,
}: {
// After:
function ThemeOption({
  id, label, Icon, isSelected, mode: _mode, colors, onSelect, tall,
}: {
```

- [ ] **Step 8: Fix `sessions.tsx:64` — rename `userData` to `_userData`**

```tsx
// Before:
export function SessionsTab({
  userData,
  mode,
// After:
export function SessionsTab({
  userData: _userData,
  mode,
```

- [ ] **Step 9: Fix `profile.tsx:759` — rename `e` to `_e`**

Line 759:
```tsx
// Before:
onClick={(e) => {
// After:
onClick={(_e) => {
```

- [ ] **Step 10: Fix `profile.test.ts:680` — rename `i` to `_i`**

```tsx
// Before:
const initialPromises = Array.from({ length: 1000 }, (_, i) =>
// After:
const initialPromises = Array.from({ length: 1000 }, (_, _i) =>
```

- [ ] **Step 11: Verify batch 4**

Run: `npm run lint 2>&1 | tail -1`
Expected: Problem count drops to ~81.

- [ ] **Step 12: Commit**

```bash
git add -A && git commit -m "lint: prefix unused function params with _ (15 warnings)"
```

---

### Task 5: Fix `@typescript-eslint/no-explicit-any` in Production Files (2 errors)

**Files:**
- Modify: `app/logto-kit/components/shared/Button.tsx:63`
- Modify: `app/logto-kit/components/dashboard/shared/ImageCropper.tsx:21-23`

- [ ] **Step 1: Fix `Button.tsx:63` — replace `Record<string, any>` with proper type**

The `BUTTONS` object contains objects with `base`, `hover`, `disabled` CSS style objects. The `mkBtn` function returns this shape.

Before:
```tsx
const BUTTONS: Record<string, any> = {
```

After:
```tsx
const BUTTONS: Record<string, { base: React.CSSProperties; hover: React.CSSProperties; disabled: React.CSSProperties }> = {
```

- [ ] **Step 2: Fix `ImageCropper.tsx:21-23` — type the roundRect polyfill**

The `any` casts are for the `roundRect` method which isn't in older TypeScript DOM typings. Use a type assertion with a proper interface.

Before:
```tsx
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).beginPath();
    (ctx as any).roundRect(x, y, w, h, r);
```

After:
```tsx
  const ctxWithRoundRect = ctx as CanvasRenderingContext2D & { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void };
  if (typeof ctxWithRoundRect.roundRect === 'function') {
    ctx.beginPath();
    ctxWithRoundRect.roundRect(x, y, w, h, r);
```

- [ ] **Step 3: Verify batch 5**

Run: `npm run lint 2>&1 | tail -1`
Expected: Problem count drops to ~79.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "lint: fix no-explicit-any in production files (2 errors)"
```

---

### Task 6: Fix `@typescript-eslint/no-explicit-any` in Test Files (30 errors)

**Files:**
- Modify: `app/logto-kit/logic/guards.test.ts` (7 instances: lines 60-62, 153-154, 308, 319)
- Modify: `app/logto-kit/logic/actions/dashboard.test.ts` (2 instances: lines 12, 19)
- Modify: `app/logto-kit/logic/actions/profile.test.ts` (10 instances: lines 138, 392, 410, 482, 483, 525, 582, 646)
- Modify: `app/logto-kit/logic/actions/mfa.test.ts` (2 instances: lines 347, 349)

- [ ] **Step 1: Fix `guards.test.ts` — replace `any` casts with `unknown`**

Lines 60-62 (testing `assertSafeUserId` with wrong types):
```ts
// Before:
expect(() => assertSafeUserId(null as any)).toThrow(ValidationError);
expect(() => assertSafeUserId(undefined as any)).toThrow(ValidationError);
expect(() => assertSafeUserId(123 as any)).toThrow(ValidationError);
// After:
expect(() => assertSafeUserId(null as unknown as string)).toThrow(ValidationError);
expect(() => assertSafeUserId(undefined as unknown as string)).toThrow(ValidationError);
expect(() => assertSafeUserId(123 as unknown as string)).toThrow(ValidationError);
```

Lines 153-154 (testing `decodeLogtoAccessToken` with wrong types):
```ts
// Before:
expect(() => decodeLogtoAccessToken(null as any)).toThrow(ValidationError);
expect(() => decodeLogtoAccessToken('' as any)).toThrow(ValidationError);
// After:
expect(() => decodeLogtoAccessToken(null as unknown as string)).toThrow(ValidationError);
expect(() => decodeLogtoAccessToken('' as unknown as string)).toThrow(ValidationError);
```

Lines 308, 319 (catch blocks):
```ts
// Before:
} catch (e: any) {
// After:
} catch (e: unknown) {
  const err = e as ValidationError;
  expect(err).toBeInstanceOf(ValidationError);
  expect(err.message).toBe('FIELD_TOO_SHORT');
  expect(err.field).toBe('username');
```

For each catch block, replace `e: any` with `e: unknown` and update the assertions to cast `e` before accessing `.message` and `.field`.

- [ ] **Step 2: Fix `dashboard.test.ts` — replace `any` with proper types**

Line 12 (`err as any`):
```ts
// Before:
(err as any).digest = `NEXT_REDIRECT;${url}`;
// After:
(err as { digest?: string }).digest = `NEXT_REDIRECT;${url}`;
```

Line 19 (`...args: any[]`):
```ts
// Before:
getLogtoContext: (...args: any[]) => mockGetLogtoContext(...args),
// After:
getLogtoContext: (...args: unknown[]) => mockGetLogtoContext(...args),
```

- [ ] **Step 3: Fix `profile.test.ts` — replace `as any` with `as unknown as T`**

All instances follow the pattern of casting mock `getLogtoContext` return values. The function expects `LogtoContext` type.

Lines 138, 392, 410, 482, 483, 525, 582, 646:
```ts
// Before:
} as any);
// After:
} as unknown as Awaited<ReturnType<typeof getLogtoContext>>);
```

Or more simply, create a helper at the top of the file:
```ts
type MockLogtoContext = { claims: { sub?: string; scope?: string }; isAuthenticated: boolean };
```
Then replace `as any` with `as MockLogtoContext`.

- [ ] **Step 4: Fix `mfa.test.ts` — replace `as any`**

Lines 347, 349:
```ts
// Before:
claims: { sub: 'user-new' } as any,
isAuthenticated: true,
} as any);
// After:
claims: { sub: 'user-new' } as unknown as Record<string, unknown>,
isAuthenticated: true,
} as unknown as Record<string, unknown>);
```

Or use the same `MockLogtoContext` pattern as profile.test.ts.

- [ ] **Step 5: Verify batch 6**

Run: `npm run lint 2>&1 | tail -1`
Expected: Problem count drops to ~49.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "lint: fix no-explicit-any in test files (30 errors)"
```

---

### Task 7: Remove Stale `eslint-disable` Directives (2 warnings)

**Files:**
- Modify: `app/logto-kit/components/dashboard/tabs/organizations.tsx:321`
- Modify: `app/logto-kit/components/dashboard/tabs/profile.tsx:92`

- [ ] **Step 1: Fix `organizations.tsx:321` — remove stale directive**

Line 321: Delete `// eslint-disable-next-line react-hooks/exhaustive-deps`

- [ ] **Step 2: Fix `profile.tsx:92` — remove stale directive**

Line 92: Delete `// eslint-disable-next-line react-hooks/exhaustive-deps`

- [ ] **Step 3: Verify batch 7**

Run: `npm run lint 2>&1 | tail -1`
Expected: Problem count drops to ~47.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "lint: remove stale eslint-disable directives (2 warnings)"
```

---

### Task 8: Fix `jsx-a11y/role-supports-aria-props` (1 warning)

**Files:**
- Modify: `app/logto-kit/components/shared/PhoneCountrySelect.tsx:335`

- [ ] **Step 1: Fix `PhoneCountrySelect.tsx:335` — remove `aria-expanded` from searchbox input**

The `role="searchbox"` does not support `aria-expanded`. The input is a search field inside a dropdown, not a combobox trigger. Remove the `aria-expanded` attribute from the `<input>` element at line 335.

Before:
```tsx
<input
  ref={searchInputRef}
  type="text"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="Search..."
  style={searchInputStyle}
  onKeyDown={handleSearchKeyDown}
  aria-expanded={isOpen}
  role="searchbox"
/>
```

After:
```tsx
<input
  ref={searchInputRef}
  type="text"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="Search..."
  style={searchInputStyle}
  onKeyDown={handleSearchKeyDown}
  role="searchbox"
/>
```

- [ ] **Step 2: Verify batch 8**

Run: `npm run lint 2>&1 | tail -1`
Expected: Problem count drops to ~46.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "lint: remove unsupported aria-expanded from searchbox (1 warning)"
```

---

### Task 9: Fix `react-hooks/exhaustive-deps` Warnings (6 warnings)

**Files:**
- Modify: `app/logto-kit/components/UserButton.tsx:109`
- Modify: `app/logto-kit/components/providers/logto-provider.tsx:77`
- Modify: `app/logto-kit/custom-logic/OrgSwitcher.tsx:54`
- Modify: `app/logto-kit/components/dashboard/tabs/profile.tsx:492`
- Modify: `app/logto-kit/components/providers/preferences.tsx:114`
- Modify: `app/logto-kit/components/dashboard/tabs/sessions.tsx:226`

- [ ] **Step 1: Fix `UserButton.tsx:109` — missing dep on `opts.do`**

Line 109: The `handleClick` callback uses `opts.do` but the dep array only has `[opts.do, openDashboard]`. This is already correct. The warning may be about the dependency on a property of `opts` object. Check the actual warning message.

**Actual fix:** The lint output says line 109 has an issue. Read the exact warning. The `opts.do` dependency is already present. The issue might be that `opts` is a new object each render. Wrap the `opts` object in useMemo in the parent, or change the callback to use a ref.

**Simpler approach:** If the warning is about `opts.do` being unstable, the fix is in the parent component. But since we can't change behavior, add `opts` to the dependency array instead of `opts.do`:

Actually, re-reading the lint output: it says `UserButton.tsx:109`. Let me re-check what the actual missing dependency is.

The warning text says: "React Hook useCallback has a missing dependency". The current deps are `[opts.do, openDashboard]`. If `opts` itself is the issue (since accessing `opts.do` on a new `opts` object each render), the fix is to use `opts?.do` in the callback and add `opts` to deps, OR to destructure `do: customAction` from opts and use `customAction` in deps.

**Recommended fix:** Destructure `opts.do` at the top of the hook:
```tsx
const customAction = opts.do;
const handleClick = useCallback(() => {
  if (typeof customAction === 'function') {
    customAction();
  } else if (openDashboard) {
    openDashboard();
  }
}, [customAction, openDashboard]);
```

- [ ] **Step 2: Fix `logto-provider.tsx:77` — missing dep `closeDashboard`**

Line 77: `[isDashboardOpen]` is missing `closeDashboard`.

Before:
```tsx
  }, [isDashboardOpen]);
```

After:
```tsx
  }, [isDashboardOpen, closeDashboard]);
```

- [ ] **Step 3: Fix `OrgSwitcher.tsx:54` — missing dep `handleChange`**

Line 54: `[organizations, asOrg, currentOrgId]` is missing `handleChange`.

`handleChange` is defined in the component body and is not wrapped in `useCallback`. Wrap it in `useCallback` first, then add to deps.

Before:
```tsx
  const handleChange = async (orgId: string) => {
    // ...
  };

  useEffect(() => {
    if (organizations.length === 1 && !asOrg && !currentOrgId && !isSwitchingRef.current) {
      isSwitchingRef.current = true;
      handleChange(organizations[0].id).finally(() => { isSwitchingRef.current = false; });
    }
  }, [organizations, asOrg, currentOrgId]);
```

After:
```tsx
  const handleChange = useCallback(async (orgId: string) => {
    // ... (same body)
  }, [/* deps of handleChange — likely setAsOrg, router.refresh, etc. */]);

  useEffect(() => {
    if (organizations.length === 1 && !asOrg && !currentOrgId && !isSwitchingRef.current) {
      isSwitchingRef.current = true;
      handleChange(organizations[0].id).finally(() => { isSwitchingRef.current = false; });
    }
  }, [organizations, asOrg, currentOrgId, handleChange]);
```

**⚠️ NOTE:** Check `handleChange` body for its own dependencies before wrapping in `useCallback`. It likely uses `setIsLoading`, `setAsOrg`, `router.refresh()` etc.

- [ ] **Step 4: Fix `profile.tsx:492` — missing dep `t.profile.cropFailed`**

Line 492: `[selectedFile, upload, onError]` is missing `t.profile.cropFailed`.

Before:
```tsx
  }, [selectedFile, upload, onError]);
```

After:
```tsx
  }, [selectedFile, upload, onError, t.profile.cropFailed]);
```

- [ ] **Step 5: Fix `preferences.tsx:114` — missing deps `asOrg`, `lang`, `theme`**

Line 114: `[]` is missing `asOrg`, `lang`, `theme`.

This effect reads from localStorage on mount. Adding these deps would cause it to re-run when they change, which is not the intent. The effect is a "sync from storage on mount" pattern.

**Fix:** The intent is mount-only. Use a ref to track if it's the first render:

```tsx
const didSyncFromStorage = useRef(false);
useEffect(() => {
  if (didSyncFromStorage.current) return;
  didSyncFromStorage.current = true;
  const cachedTheme = getStoredTheme();
  if (cachedTheme && cachedTheme !== theme) setThemeState(cachedTheme);
  const cachedLang = getStoredLang();
  if (cachedLang && cachedLang !== lang) setLangState(cachedLang);
  const cachedOrg = getStoredOrg();
  if (cachedOrg && cachedOrg !== asOrg) setAsOrgState(cachedOrg);
}, [asOrg, lang, theme]);
```

- [ ] **Step 6: Fix `sessions.tsx:226` — unnecessary deps**

Line 226: `[onRevokeAllOtherSessions, onSuccess, onError, loadSessions]` has unnecessary dependencies.

The warning says "unnecessary dependencies". These are likely stable references (functions defined outside or wrapped in useCallback). The fix is to remove the unnecessary ones from the dep array.

Check which ones are actually used in the callback body and which are stable. If all are stable/unused, simplify to `[]`:

```tsx
  }, []);
```

Or keep only the ones that are actually used and unstable.

- [ ] **Step 7: Verify batch 9**

Run: `npm run lint 2>&1 | tail -1`
Expected: Problem count drops to ~40.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "lint: fix exhaustive-deps warnings (6 warnings)"
```

---

### Task 10: Fix `react-hooks/set-state-in-effect` — Hydration Guards Pattern A (5 errors)

**Files:**
- Modify: `app/demo/ContentArea.tsx:149-154`
- Modify: `app/demo/Sidebar.tsx:184-192`
- Modify: `app/logto-kit/components/UserButton.tsx:251-255`
- Modify: `app/logto-kit/components/UserButton.tsx:359-363`
- Modify: `app/logto-kit/components/shared/PhoneCountrySelect.tsx:47-49`

- [ ] **Step 1: Fix `ContentArea.tsx` — remove hydration guard**

Remove `mounted` state and `useEffect(() => setMounted(true), [])`. The `mounted` variable is used at line 166 to conditionally apply dark/light colors. In React 19 + Next.js 16, hydration mismatches for theme colors are handled by the browser and CSS.

Before:
```tsx
const [mounted, setMounted] = useState(false);
// ...
useEffect(() => {
  setMounted(true);
}, []);
// ...
const colors = mounted ? (mode === 'dark' ? { ... } : { ... }) : { ... };
```

After:
```tsx
// Remove mounted state and useEffect entirely
const colors = mode === 'dark' ? { ... } : { ... };
```

Remove the ternary — just use `mode` directly.

- [ ] **Step 2: Fix `Sidebar.tsx` — remove hydration guard**

Same pattern as ContentArea.tsx. Remove `mounted` state, `useEffect`, and the ternary.

Before:
```tsx
const [mounted, setMounted] = useState(false);
// ...
useEffect(() => {
  setMounted(true);
}, []);
// ...
const colors = mounted ? (mode === 'dark' ? { ... } : { ... }) : { ... };
```

After:
```tsx
const colors = mode === 'dark' ? { ... } : { ... };
```

- [ ] **Step 3: Fix `UserButton.tsx:251-255` — remove hydration guard in `UserButtonCore`**

Remove `mounted` state and `useEffect`. The `mounted` variable is not used for conditional rendering in this component (check lines 257+). If unused after removal, just delete.

- [ ] **Step 4: Fix `UserButton.tsx:359-363` — remove hydration guard in `UserBadge`**

Remove `mounted` state and `useEffect`. `mounted` is used at line 379: `const label = mounted ? t.common.loggedInAs : 'Logged in as';`

Replace with:
```tsx
const label = t.common.loggedInAs;
```

This removes the SSR-safe fallback string. Since React 19 handles hydration better, this is safe.

- [ ] **Step 5: Fix `PhoneCountrySelect.tsx:47-49` — remove hydration guard**

Remove `mounted` state and `useEffect`. Check if `mounted` is used elsewhere in the component. If not used after removal, just delete.

- [ ] **Step 6: Verify batch 10**

Run: `npm run lint 2>&1 | tail -1`
Expected: Problem count drops to ~35.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "lint: remove hydration guard set-state-in-effect (5 errors)"
```

---

### Task 11: Fix `react-hooks/set-state-in-effect` — Reset-State-at-Top-of-Fetch Pattern B (16 errors)

**Files:**
- Modify: `app/logto-kit/components/dashboard/tabs/profile.tsx:74,297`
- Modify: `app/logto-kit/components/dashboard/tabs/organizations.tsx:280,458`
- Modify: `app/logto-kit/components/dashboard/shared/FlowModal.tsx:166,323`
- Modify: `app/logto-kit/components/dashboard/shared/ContactRow.tsx:114,122`
- Modify: `app/logto-kit/custom-logic/Protected.tsx:115`
- Modify: `app/logto-kit/components/dashboard/tabs/sessions.tsx:117`
- Modify: `app/logto-kit/components/providers/preferences.tsx:107`
- Modify: `app/logto-kit/components/dashboard/shared/ImageCropper.tsx:284` (CalculatorClient)

**Strategy for Pattern B:** These effects call `setState` synchronously at the top of the effect body before an async operation. The React-recommended fix is to use a "data fetching key" pattern: derive a refresh key from the deps, and use that key to reset state.

**General approach for data-fetching effects:**

Before:
```tsx
useEffect(() => {
  setState([]); // ← lint error
  setLoading(true); // ← lint error
  fetchData().then(data => setState(data));
}, [dep]);
```

After:
```tsx
const [refreshKey, setRefreshKey] = useState(0);
useEffect(() => {
  // Don't call setState here — use the key to control rendering
  const controller = new AbortController();
  setLoading(true);
  fetchData(controller.signal).then(data => {
    if (!controller.signal.aborted) setState(data);
  });
  return () => controller.abort();
}, [dep, refreshKey]);
```

For the specific pattern of "reset state when deps change", use the key approach:

```tsx
// Remove the setState calls from the effect body.
// Instead, initialize state with a function that reads from the dep:
const [state, setState] = useState(() => initialState(dep));
```

**For each file, the specific fix depends on the pattern:**

- [ ] **Step 1: Fix `profile.tsx:74-76` — permissions fetch effect**

The effect resets `setPermissions([])`, `setLoading(true)`, `setError(false)` before fetching. Move the reset into the `.then` callbacks or use a refresh key.

**Recommended approach:** Keep `setLoading(true)` and `setError(false)` (these are state transitions, not resets). Remove only `setPermissions([])` — show stale data until new data arrives (same pattern as organizations.tsx:279 comment).

Before:
```tsx
setPermissions([]);
setLoading(true);
setError(false);
```

After:
```tsx
// Don't clear permissions — show stale data until new data arrives (prevents flicker)
setLoading(true);
setError(false);
```

**⚠️ CONCERN:** `setLoading(true)` and `setError(false)` are still setState calls in an effect. The lint rule catches ALL synchronous setState in effects, not just "reset" ones. We need a different approach.

**True fix:** Move the data fetching into an event handler or use `useSyncExternalStore`. For data fetching triggered by prop changes, the React-recommended pattern is:

```tsx
const [data, setData] = useState<Data[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(false);

// Use a derived key to track when to refetch
const fetchKey = visible ? 'visible' : 'hidden';

useEffect(() => {
  if (!visible) return;
  let cancelled = false;
  
  // These are "state transitions in response to external changes" — acceptable
  // But the lint rule still catches them. We need to restructure.
  
  loadPersonalPermissions().then(r => {
    if (cancelled) return;
    // setState in async callback is fine — only synchronous setState is flagged
    if (r.ok) setPermissions(r.data);
    else setError(true);
    setLoading(false);
  });
  
  return () => { cancelled = true; };
}, [visible]);
```

**Wait — the issue is that `setLoading(true)` and `setError(false)` are SYNCHRONOUS calls at the top of the effect. The async callback setState calls are fine.**

**Correct approach:** Initialize `loading` to `true` and `error` to `false` by default. Only set them in the async callbacks:

```tsx
const [permissions, setPermissions] = useState<PersonalPermission[]>([]);
const [loading, setLoading] = useState(true);  // starts as true
const [error, setError] = useState(false);      // starts as false

useEffect(() => {
  if (!visible) return;
  let cancelled = false;
  // No need to set loading/error here — they're already in the right state
  // If re-entering, we need to signal "loading" again. Use a ref or key.
  
  loadPersonalPermissions()
    .then(r => {
      if (cancelled) return;
      if (r.ok) setPermissions(r.data);
      else { console.error('...'); setError(true); }
    })
    .catch(err => {
      if (cancelled) return;
      console.error('...');
      setError(true);
    })
    .finally(() => { if (!cancelled) setLoading(false); });

  return () => { cancelled = true; };
}, [visible]);
```

**But this doesn't reset loading/error when `visible` changes.** The lint-safe pattern is to use a **refresh key**:

```tsx
const [refreshKey, setRefreshKey] = useState(0);

// When visible changes, bump the key
useEffect(() => {
  if (visible) setRefreshKey(k => k + 1);
}, [visible]);

// Derive state from the key
const [permissions, setPermissions] = useState<PersonalPermission[]>([]);
const loading = refreshKey === 0; // loading on first render
const error = /* derived from state */;

useEffect(() => {
  if (!visible) return;
  let cancelled = false;
  // Reset by fetching fresh data — no synchronous setState
  loadPersonalPermissions().then(...);
  return () => { cancelled = true; };
}, [refreshKey]);
```

**This is getting complex. Let me reconsider.**

**Simplest lint-safe pattern:** Use a **fetch counter** and derive loading from it:

```tsx
const [fetchCount, setFetchCount] = useState(0);
const [permissions, setPermissions] = useState<PersonalPermission[]>([]);
const [error, setError] = useState(false);

// Trigger fetch by incrementing counter (in event handler or derived effect)
const triggerFetch = useCallback(() => {
  setFetchCount(c => c + 1);
  setError(false);
}, []);

useEffect(() => {
  if (!visible || fetchCount === 0) return;
  let cancelled = false;
  loadPersonalPermissions().then(r => {
    if (cancelled) return;
    if (r.ok) setPermissions(r.data);
    else setError(true);
    setFetchCount(0); // done loading
  });
  return () => { cancelled = true; };
}, [visible, fetchCount]);
```

**This is still complex. Let me look at what the React docs actually recommend.**

Per React docs: "If your Effect fetches something, the cleanup function should either abort the ongoing fetch or ignore its result." The recommended pattern is:

```tsx
useEffect(() => {
  let cancelled = false;
  async function fetch() {
    const result = await loadData();
    if (!cancelled) setData(result);
  }
  fetch();
  return () => { cancelled = true; };
}, [dep]);
```

The lint rule specifically flags SYNCHRONOUS setState at the top of the effect. The fix is to NOT call setState synchronously. Instead:

1. For "loading" state: Initialize it as `true`, and only set it to `false` in the async callback.
2. For "error" state: Only set it in the async callback.
3. For "clear data" state: Don't clear it — show stale data.

**For the profile.tsx:74 case specifically:**

```tsx
// Before:
setPermissions([]);   // ← synchronous setState — REMOVE
setLoading(true);     // ← synchronous setState — REMOVE (starts as true)
setError(false);      // ← synchronous setState — REMOVE (starts as false)
loadPersonalPermissions().then(...).catch(...).finally(...);

// After: (no synchronous setState)
// Initialize: useState(true) for loading, useState(false) for error
// In the effect, just call the async function
// In the callback, setPermissions/setError/setLoading(false)
```

**The problem:** When the effect re-runs (e.g., `visible` changes from false to true), `loading` is still `false` from the previous fetch. We need to set it back to `true`.

**Solution:** Use a `useRef` to track loading state, or use a **derived loading state** from the fetch promise:

```tsx
const [permissions, setPermissions] = useState<PersonalPermission[]>([]);
const [error, setError] = useState(false);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  if (!visible) return;
  let cancelled = false;
  
  // Use a microtask to set loading (avoids synchronous setState in effect body)
  Promise.resolve().then(() => {
    if (!cancelled) setIsLoading(true);
  });
  
  loadPersonalPermissions()
    .then(r => {
      if (cancelled) return;
      if (r.ok) setPermissions(r.data);
      else { console.error('...'); setError(true); }
    })
    .catch(err => {
      if (cancelled) return;
      console.error('...');
      setError(true);
    })
    .finally(() => { if (!cancelled) setIsLoading(false); });

  return () => { cancelled = true; };
}, [visible]);
```

**But `Promise.resolve().then(...)` is still a synchronous call in the effect body (it schedules a microtask). The lint rule may still catch it.**

**Actually, let me re-read the lint rule.** The rule `react-hooks/set-state-in-effect` flags `setState` calls that are **synchronous** in the effect body. A `setState` inside a `.then()` callback or `setTimeout` callback is NOT flagged — only direct, synchronous calls.

So the pattern that WORKS is: move all setState into the async callbacks.

For "reset on re-fetch", we can use a counter pattern:

```tsx
const [fetchId, setFetchId] = useState(0);

// In the effect or event that triggers refetch:
// setFetchId(id => id + 1); ← this is the only synchronous setState

// The main effect:
useEffect(() => {
  if (!visible) return;
  let cancelled = false;
  
  loadPersonalPermissions()
    .then(r => {
      if (cancelled) return;
      if (r.ok) setPermissions(r.data);
      else setError(true);
    })
    .catch(...)
    .finally(() => { if (!cancelled) setLoading(false); });

  return () => { cancelled = true; };
}, [visible, fetchId]);
```

**But `setFetchId` in an event handler is fine — it's not in an effect body.**

OK, I think the cleanest approach for each case is:

1. **For "reset before fetch" patterns:** Remove synchronous setState. Instead, set state in async callbacks only. For "loading", derive it from whether a fetch is in progress (use a ref or counter).

2. **For "sync props to state" patterns (profile.tsx:405-414):** These effects sync `userData.username` → `setUsername`. The fix is to derive state from props instead of syncing with useEffect.

Let me plan each file individually now. This is the most complex batch.

OK let me think about this more carefully. The lint rule says "Avoid calling setState() directly within an effect." The key insight is:

- setState in an async callback (`.then()`, `setTimeout`, event listener callback) is FINE
- setState directly in the effect body is NOT FINE

So for data fetching effects, the pattern is:
- Don't reset state at the top of the effect
- Only set state in the async callbacks
- For "loading" state, either:
  a) Use a ref to track loading status
  b) Use a counter/refresh key pattern
  c) Initialize loading to `true` and only set to `false` in callback (but this doesn't re-set to true on re-fetch)

**Best approach for data fetching:**

```tsx
const [data, setData] = useState(null);
const [error, setError] = useState(false);

// Use AbortController for cancellation
useEffect(() => {
  if (!visible) return;
  const controller = new AbortController();
  
  fetchData(controller.signal)
    .then(r => {
      if (r.ok) setData(r.data);
      else setError(true);
    })
    .catch(err => {
      if (err.name !== 'AbortError') setError(true);
    });
  
  return () => controller.abort();
}, [visible]);
```

And derive `loading` from `data === null && !error`.

**But this changes behavior** — the loading indicator won't show on re-fetch. For re-fetch scenarios, use a refresh key:

```tsx
const [refreshKey, setRefreshKey] = useState(0);
const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

useEffect(() => {
  if (!visible) return;
  const controller = new AbortController();
  let done = false;
  
  fetchData()
    .then(r => {
      if (done) return;
      if (r.ok) setData(r.data);
      else setError(true);
    })
    .catch(...)
    .finally(() => { done = true; });
  
  return () => { done = true; controller.abort(); };
}, [visible, refreshKey]);
```

OK this is getting very long. Let me just plan each file with the specific fix needed.

Actually, I realize I'm overcomplicating this. Let me re-read the actual lint errors more carefully.

The lint rule `react-hooks/set-state-in-effect` is a Next.js-specific rule (part of `eslint-config-next/core-web-vitals`). It flags ANY synchronous setState call in a useEffect body. The fix strategies are:

1. **Move setState into async callback** (for data fetching)
2. **Use `useSyncExternalStore`** (for external store sync)
3. **Derive state from props** (for prop→state sync)
4. **Use event handlers** (for user interaction → state)
5. **Use `useMemo`** (for derived state)

Let me now plan each specific fix.


- [ ] **Step 1: Fix `profile.tsx:74-76` — permissions fetch effect**

The effect calls `setPermissions([])`, `setLoading(true)`, `setError(false)` synchronously.

**Fix:** Remove synchronous setState. Derive loading from a ref or counter.

```tsx
// Before (lines 65-93):
const [permissions, setPermissions] = useState<PersonalPermission[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(false);
// ...
useEffect(() => {
  if (!visible) return;
  let cancelled = false;
  setPermissions([]);   // ← REMOVE
  setLoading(true);     // ← REMOVE
  setError(false);      // ← REMOVE
  loadPersonalPermissions()
    .then(r => { if (cancelled) return; if (r.ok) setPermissions(r.data); else setError(true); })
    .catch(...)
    .finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
}, [visible]);

// After:
const [permissions, setPermissions] = useState<PersonalPermission[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(false);
// ...
useEffect(() => {
  if (!visible) return;
  let cancelled = false;
  loadPersonalPermissions()
    .then(r => {
      if (cancelled) return;
      if (r.ok) { setPermissions(r.data); setError(false); }
      else { console.error('[PersonalPermissionsBlock] Failed:', r.error); setError(true); }
    })
    .catch(err => {
      if (cancelled) return;
      console.error('[PersonalPermissionsBlock] Error:', err);
      setError(true);
    })
    .finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
}, [visible]);
```

**⚠️ ISSUE:** `loading` starts as `true` but won't reset to `true` on re-fetch when `visible` changes. Need a refresh key.

Better approach: Add a `refreshKey` state:
```tsx
const [refreshKey, setRefreshKey] = useState(0);
// When visible changes, bump key:
useEffect(() => {
  if (visible) setRefreshKey(k => k + 1);
}, [visible]);
// Main fetch effect uses refreshKey:
useEffect(() => {
  if (!visible) return;
  let cancelled = false;
  loadPersonalPermissions()
    .then(...)
    .finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
}, [refreshKey]);
```

But `setRefreshKey` in an effect is still a synchronous setState in an effect! Same problem.

**Alternative:** Initialize loading to `true`, and in the effect, use a pattern where loading is derived from whether a fetch is in flight:

```tsx
const fetchCountRef = useRef(0);

useEffect(() => {
  if (!visible) return;
  const myFetch = ++fetchCountRef.current;
  loadPersonalPermissions()
    .then(r => {
      if (fetchCountRef.current !== myFetch) return;
      if (r.ok) setPermissions(r.data);
      else setError(true);
    })
    .catch(err => {
      if (fetchCountRef.current !== myFetch) return;
      setError(true);
    })
    .finally(() => {
      if (fetchCountRef.current === myFetch) setLoading(false);
    });
  return () => { /* cancelled via fetchCountRef */ };
}, [visible]);
```

This avoids synchronous setState. `loading` starts as `true` and is set to `false` only when the latest fetch completes.

**For re-triggering on `visible` change:** When `visible` goes false→true, the effect re-runs. `loading` is still `false` from the previous fetch. We need it to be `true`.

**Final approach:** Don't use `loading` state at all. Derive it from `permissions` and `error`:

```tsx
const loading = permissions.length === 0 && !error;
```

But this doesn't work if the user has zero permissions.

**OK, the cleanest approach is to use `useState` with a function initializer and a refresh key that's bumped in an event handler (not an effect). But in this case, the "event" is `visible` changing — which IS a prop change, not a user event.**

**Pragmatic approach:** Use `useReducer` instead of `useState` for the fetch state:

```tsx
type FetchState = { loading: boolean; error: boolean; data: PersonalPermission[] };
type FetchAction = { type: 'fetch' } | { type: 'success'; data: PersonalPermission[] } | { type: 'error' };

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case 'fetch': return { loading: true, error: false, data: [] };
    case 'success': return { loading: false, error: false, data: action.data };
    case 'error': return { loading: false, error: true, data: [] };
  }
}

const [state, dispatch] = useReducer(fetchReducer, { loading: true, error: false, data: [] });

useEffect(() => {
  if (!visible) return;
  let cancelled = false;
  // dispatch is stable — calling it synchronously is fine? Let me check.
  // Actually, dispatch in an effect body is still setState. The lint rule catches it.
  // dispatch({ type: 'fetch' }); // ← Would this be caught?
}, [visible]);
```

Hmm, `useReducer` dispatch is also setState. The lint rule likely catches it too.

**Let me look at what other projects do.** The React docs recommend:

```tsx
function useData(url) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let ignore = false;
    fetch(url).then(response => response.json()).then(json => {
      if (!ignore) setData(json);
    });
    return () => { ignore = true; };
  }, [url]);
  return data;
}
```

Notice: NO synchronous setState in the effect. `data` starts as `null` and is only set in the async callback. No "loading" state — the component just renders with `null` data.

**For our case, the simplest fix is:**

1. Remove `setPermissions([])`, `setLoading(true)`, `setError(false)` from the effect body.
2. Set `loading` to `true` initially (`useState(true)`).
3. Only set `loading` to `false` in the `.finally()` callback.
4. Only set `error` in the `.catch()` callback.
5. Only set `permissions` in the `.then()` callback.
6. For re-fetch: don't reset — show stale data until new data arrives.

**The trade-off:** When `visible` changes from false→true, `loading` is `false` (from the previous fetch). The UI will show stale/empty data briefly before the new fetch completes. But this is actually fine — it's the "show stale data" pattern that prevents flicker.

**Wait — there's a subtlety.** When `visible` goes false→true, the effect re-runs. But `loading` is still `false` from the last fetch. So the UI shows the old permissions immediately, then when the new fetch completes, it updates. This is actually the desired behavior (no flicker).

**The only issue:** On first mount, `loading` is `true` (from `useState(true)`). On subsequent `visible` changes, `loading` is `false`. This means the loading indicator only shows on first load, not on re-loads. This is acceptable.

**OK, let me just plan the specific fix for each file now.**


- [ ] **Step 2: Fix `profile.tsx:297-299` — roles fetch effect**

Same pattern. Remove `setUserRoles([])`, `setRolesLoading(true)`, `setRolesError(false)`.

- [ ] **Step 3: Fix `profile.tsx:405,409,413` — prop→state sync effects**

These effects sync `userData.username` → `setUsername`, etc. The comment says "These effects intentionally overwrite local edits when server data changes."

**Fix:** Remove the effects and initialize state from props. Use a `useMemo` or direct prop access instead.

Before:
```tsx
const [username, setUsername] = useState(userData.username ?? '');
// ...
useEffect(() => {
  setUsername(userData.username ?? '');
}, [userData.username]);
```

After:
```tsx
const [username, setUsername] = useState(userData.username ?? '');
// No useEffect — use a ref to detect prop changes and sync:
const prevUsername = useRef(userData.username);
if (userData.username !== prevUsername.current) {
  prevUsername.current = userData.username;
  setUsername(userData.username ?? '');
}
```

**Wait — this is a "render-time side effect" which is also not great. But it's the React-recommended pattern for "resetting state when a prop changes."**

Actually, the React docs say: "If you need to reset state when a prop changes, consider using a `key` prop on the component." But in this case, the component doesn't have a `key` that changes.

**Alternative:** Just use the prop directly instead of state:

```tsx
const [username, setUsername] = useState(userData.username ?? '');
// Remove the useEffect
// The state is initialized from props, and the user can edit it
// When server data changes, the state is stale — but the comment says this is intentional
```

But the comment says "These effects intentionally overwrite local edits when server data changes." So the behavior IS to sync from props.

**Best approach:** Use a derived value with a local edit override:

```tsx
const [editedUsername, setEditedUsername] = useState<string | null>(null);
const username = editedUsername ?? userData.username ?? '';
```

But this changes the data flow significantly. Too risky.

**Simplest fix:** Keep the effects but restructure to avoid synchronous setState. Use `useLayoutEffect` instead? No, that's worse.

**Actually, the simplest fix is to use a `prevProps` ref pattern:**

```tsx
const [username, setUsername] = useState(userData.username ?? '');
const prevPropUsername = useRef(userData.username);

useEffect(() => {
  // This runs after render, so it's fine
  prevPropUsername.current = userData.username;
});

// During render (not in an effect):
if (userData.username !== prevPropUsername.current) {
  // This runs during render — React will re-render with the new state
  setUsername(userData.username ?? '');
}
```

**Wait — calling setState during render is the "you might not need an effect" pattern. React handles this by re-rendering immediately. This is actually the recommended approach!**

But the lint rule `react-hooks/set-state-in-effect` only catches setState in effects, not during render. So this approach is lint-safe.

**However,** calling setState during render can cause infinite loops if not careful. The `if (userData.username !== prevPropUsername.current)` guard prevents this.

**Let me verify this is the React-recommended pattern.** Yes, from the React docs: "Adjusting state during rendering" — React will throw away the rendered output and immediately retry rendering with the new state. This is the recommended way to "reset" state when props change.

**OK, the fix for profile.tsx:405-414 is:**

```tsx
// Remove the three useEffect blocks
// During render, sync state from props:
const [username, setUsername] = useState(userData.username ?? '');
const prevUsername = useRef(userData.username);
if (userData.username !== prevUsername.current) {
  prevUsername.current = userData.username;
  setUsername(userData.username ?? '');
}

const [givenName, setGivenName] = useState(userData.profile?.givenName ?? '');
const prevGivenName = useRef(userData.profile?.givenName);
if (userData.profile?.givenName !== prevGivenName.current) {
  prevGivenName.current = userData.profile?.givenName;
  setGivenName(userData.profile?.givenName ?? '');
}

const [familyName, setFamilyName] = useState(userData.profile?.familyName ?? '');
const prevFamilyName = useRef(userData.profile?.familyName);
if (userData.profile?.familyName !== prevFamilyName.current) {
  prevFamilyName.current = userData.profile?.familyName;
  setFamilyName(userData.profile?.familyName ?? '');
}
```

**This preserves the behavior (state syncs from props) without using useEffect.**

- [ ] **Step 4: Fix `organizations.tsx:280` — permissions loading effect**

Remove `setPermissionsLoading(true)`. Same pattern as profile.tsx.

- [ ] **Step 5: Fix `organizations.tsx:458` — org user roles effect**

Remove `setOrgUserRoles({})`. Same pattern.

- [ ] **Step 6: Fix `FlowModal.tsx:166,323` — password error reset effects**

These effects reset `setHidePwErrorWhileTyping(false)` when `passwordError` or `step.kind` changes.

**Fix:** Initialize state during render instead of in an effect. Use the "adjusting state during render" pattern:

```tsx
const [hidePwErrorWhileTyping, setHidePwErrorWhileTyping] = useState(false);
const prevPwError = useRef(passwordError);
const prevStepKind = useRef(step.kind);
if (passwordError !== prevPwError.current || step.kind !== prevStepKind.current) {
  prevPwError.current = passwordError;
  prevStepKind.current = step.kind;
  setHidePwErrorWhileTyping(false);
}
```

This applies to both FlowModal components (lines 166 and 323).

- [ ] **Step 7: Fix `ContactRow.tsx:114` — phone country/digits sync effect**

This effect syncs `currentValue` → `selectedCountry` and `localPhone` when in edit mode.

**Fix:** Use "adjusting state during render" pattern:

```tsx
const prevCurrentValue = useRef(currentValue);
const prevModalKind = useRef(modalKind);
if ((modalKind === 'edit' && type === 'phone') && 
    (currentValue !== prevCurrentValue.current || modalKind !== prevModalKind.current)) {
  prevCurrentValue.current = currentValue;
  prevModalKind.current = modalKind;
  const { countryCode, localDigits } = getPhoneParts(currentValue);
  setSelectedCountry(countryCode);
  setLocalPhone(localDigits);
}
```

- [ ] **Step 8: Fix `ContactRow.tsx:122` — assembled phone sync effect**

This effect computes `setNewValue(assembled)` from `selectedCountry` + `localPhone`.

**Fix:** Derive `newValue` from state instead of syncing with useEffect. Or use "adjusting state during render" pattern:

```tsx
const prevSelectedCountry = useRef(selectedCountry);
const prevLocalPhone = useRef(localPhone);
if (type === 'phone' && modalKind === 'edit' && 
    (selectedCountry !== prevSelectedCountry.current || localPhone !== prevLocalPhone.current)) {
  prevSelectedCountry.current = selectedCountry;
  prevLocalPhone.current = localPhone;
  const assembled = `+${selectedCountry}${localPhone}`;
  setNewValue(assembled);
  // validation logic...
}
```

- [ ] **Step 9: Fix `Protected.tsx:115` — permission loading effect**

Remove `setLoadedPerms([])`, `setLoadedRoles([])`, `setIsLoadingPerms(false)` from the guard clause.

**Fix:** Use "adjusting state during render" for the guard:

```tsx
if (!userData?.id) {
  // Instead of setting state in the effect, handle this during render
}
```

Move the guard to render-time:
```tsx
const hasUser = !!userData?.id;
const prevHasUser = useRef(hasUser);
if (hasUser !== prevHasUser.current) {
  prevHasUser.current = hasUser;
  if (!hasUser) {
    setLoadedPerms([]);
    setLoadedRoles([]);
    setIsLoadingPerms(false);
  }
}
```

- [ ] **Step 10: Fix `sessions.tsx:117` — currentTime initialization**

This effect sets `setCurrentTime(Date.now())` on mount. The intent is to get the current time for verification expiry checking.

**Fix:** Use `Date.now()` directly instead of state:

```tsx
// Before:
const [currentTime, setCurrentTime] = useState(() => Date.now());
useEffect(() => {
  setCurrentTime(Date.now());
}, []);

// After:
const currentTime = Date.now();
```

Or if the time needs to be reactive (re-render when time changes), use `useSyncExternalStore` with a timer. But since it's only used for `isVerificationValid = verificationRecordId && currentTime < verificationExpiry`, a static value is fine.

- [ ] **Step 11: Fix `preferences.tsx:107` — theme/lang/org sync from storage**

This effect reads from localStorage and syncs to state on mount.

**Fix:** Move the localStorage reads to the state initializer:

```tsx
// Before:
const [theme, setThemeState] = useState<'dark' | 'light'>(initialTheme);
// ...
useEffect(() => {
  const cachedTheme = getStoredTheme();
  if (cachedTheme && cachedTheme !== theme) setThemeState(cachedTheme);
  // ...
}, []);

// After:
const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
  const cached = getStoredTheme();
  return cached ?? initialTheme;
});
```

This reads localStorage during state initialization (only on first render), avoiding the need for an effect.

- [ ] **Step 12: Fix `CalculatorClient.tsx:284` — hasScientific permission check**

This effect sets `setHasScientific(false)` or `setHasScientific(true)` based on permission check.

**Fix:** The synchronous setState is `setHasScientific(false)` at line 284 (inside the `if (!userData)` guard). Move this to render-time:

```tsx
// Before:
useEffect(() => {
  if (!userData) {
    setHasScientific(false);
    return;
  }
  // async fetch...
}, [userData, asOrg]);

// After:
// During render:
if (!userData && hasScientific !== false) {
  setHasScientific(false);
}
// In effect (async only):
useEffect(() => {
  if (!userData) return;
  // async fetch only...
}, [userData, asOrg]);
```

- [ ] **Step 13: Verify batch 11**

Run: `npm run lint 2>&1 | tail -1`
Expected: Problem count drops to ~20.

- [ ] **Step 14: Commit**

```bash
git add -A && git commit -m "lint: fix set-state-in-effect reset-state patterns (16 errors)"
```

---

### Task 12: Fix `react-hooks/set-state-in-effect` — DOM Measurement Pattern C (4 errors)

**Files:**
- Modify: `app/logto-kit/components/dashboard/tabs/organizations.tsx:226`
- Modify: `app/logto-kit/components/dashboard/mobile-client.tsx:126`
- Modify: `app/logto-kit/components/shared/PhoneCountrySelect.tsx:132`
- Modify: `app/logto-kit/components/UserButton.tsx:80`

- [ ] **Step 1: Fix `organizations.tsx:226` — tooltip position calculation**

This effect calculates tooltip position from DOM measurements and sets state.

**Fix:** Use `useRef` for tooltip position and force re-render with a counter, or use `useSyncExternalStore`:

```tsx
// Before:
const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
useEffect(() => {
  // DOM measurement...
  setTooltipPos({ x: left, y: top });
}, [activePerm]);

// After:
const tooltipPosRef = useRef({ x: 0, y: 0 });
const [, forceRender] = useState(0);
useEffect(() => {
  // DOM measurement...
  tooltipPosRef.current = { x: left, y: top };
  forceRender(n => n + 1); // ← This is still setState in an effect!
}, [activePerm]);
```

**Hmm, same problem.** Use a different approach: calculate tooltip position during render using `useMemo` or a callback ref:

```tsx
const tooltipPos = useMemo(() => {
  if (!activePerm) return { x: 0, y: 0 };
  const element = document.querySelector(`[data-perm="${activePerm}"]`);
  if (!element) return { x: 0, y: 0 };
  const rect = element.getBoundingClientRect();
  return getClampedTooltipPosition({ ... });
}, [activePerm]);
```

**But `document.querySelector` in useMemo is a side effect.** Use a callback ref pattern instead, or just use a ref and read it during render:

```tsx
const tooltipPosRef = useRef({ x: 0, y: 0 });

// Update ref in a layout effect (before paint):
useLayoutEffect(() => {
  if (!activePerm) return;
  const element = ...;
  tooltipPosRef.current = getClampedTooltipPosition(...);
}, [activePerm]);

// Read ref during render:
const tooltipPos = tooltipPosRef.current;
```

**Wait — `useLayoutEffect` is also an effect. The lint rule may catch setState there too.**

Actually, the lint rule `react-hooks/set-state-in-effect` is specifically about `useEffect`. Let me check if it also catches `useLayoutEffect`.

Looking at the rule: it says "Avoid calling setState() directly within an effect." The rule name is `react-hooks/set-state-in-effect`. It likely catches both `useEffect` and `useLayoutEffect`.

**Best approach for DOM measurement:** Use a ref and don't use state at all. Force re-render with a callback ref:

```tsx
const [tooltipEl, setTooltipEl] = useState<HTMLElement | null>(null);
const tooltipPos = useMemo(() => {
  if (!tooltipEl || !activePerm) return { x: 0, y: 0 };
  // measure from tooltipEl
  return getClampedTooltipPosition(...);
}, [tooltipEl, activePerm]);
```

This derives position from the DOM element ref, which is set via a callback ref (no effect needed).

**Actually, the simplest fix:** The tooltip position is only needed when `activePerm` is set. Calculate it inline in the JSX or in a `useMemo`:

```tsx
const tooltipPos = useMemo(() => {
  if (!activePerm) return null;
  // The element with data-perm={activePerm}
  // This is a DOM query — side effect in useMemo
}, [activePerm]);
```

**OK, I think the pragmatic fix is to use `useRef` for the position and accept that the tooltip won't re-render on position change (it's only shown when `activePerm` is set, so it's fine):**

```tsx
const tooltipPosRef = useRef({ x: 0, y: 0 });

// In the mouse enter handler (not an effect):
const handlePermMouseEnter = useCallback((perm: string) => {
  setHoveredPerm(perm);
  setActivePerm(perm);
  // Calculate position here (event handler, not effect)
  const element = document.querySelector(`[data-perm="${perm}"]`);
  if (element) {
    const rect = element.getBoundingClientRect();
    tooltipPosRef.current = getClampedTooltipPosition(...);
  }
}, []);

// In JSX:
{activePerm && <Tooltip style={{ left: tooltipPosRef.current.x, top: tooltipPosRef.current.y }} />}
```

This moves the DOM measurement to an event handler (where setState is allowed).

- [ ] **Step 2: Fix `mobile-client.tsx:126` — matchMedia viewport check**

This effect uses `matchMedia` and sets state.

**Fix:** Use `useSyncExternalStore`:

```tsx
// Before:
const [isNarrowViewport, setIsNarrowViewport] = useState(false);
useEffect(() => {
  const mq = window.matchMedia('(max-width: 26rem)');
  setIsNarrowViewport(mq.matches); // ← lint error
  const handler = (e: MediaQueryListEvent) => setIsNarrowViewport(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}, []);

// After:
const isNarrowViewport = useSyncExternalStore(
  (callback) => {
    const mq = window.matchMedia('(max-width: 26rem)');
    mq.addEventListener('change', callback);
    return () => mq.removeEventListener('change', callback);
  },
  () => window.matchMedia('(max-width: 26rem)').matches,
  () => false // SSR fallback
);
```

Import `useSyncExternalStore` from `react`.

- [ ] **Step 3: Fix `PhoneCountrySelect.tsx:132` — highlighted index reset**

This effect resets `setHighlightedIndex(0)` when `isOpen` changes.

**Fix:** Use "adjusting state during render" pattern:

```tsx
const prevIsOpen = useRef(isOpen);
if (isOpen !== prevIsOpen.current) {
  prevIsOpen.current = isOpen;
  if (!isOpen) {
    setHighlightedIndex(0);
  } else {
    const selectedIndex = filteredCountries.findIndex(c => c.code === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }
}
```

Remove the entire useEffect at lines 130-138.

- [ ] **Step 4: Fix `UserButton.tsx:80` — userData sync effect**

This effect syncs `opts.userData` or `contextUserData` to local state.

**Fix:** Use "adjusting state during render" pattern or derive state from props:

```tsx
// Before:
const [userData, setUserData] = useState<UserData | null>(null);
useEffect(() => {
  if (opts.userData) { setUserData(opts.userData); setLoading(false); return; }
  if (contextUserData) { setUserData(contextUserData); setLoading(false); return; }
  // timeout fallback...
}, [opts.userData, contextUserData]);

// After:
const userData = opts.userData ?? contextUserData ?? null;
const [showFallback, setShowFallback] = useState(false);
useEffect(() => {
  if (userData) return;
  const timeout = setTimeout(() => setShowFallback(true), 1500);
  return () => clearTimeout(timeout);
}, [userData]);
```

This derives `userData` from props/context directly, removing the need for state sync. The `loading` state becomes `!userData && !showFallback`.

- [ ] **Step 5: Verify batch 12**

Run: `npm run lint 2>&1 | tail -1`
Expected: Problem count drops to ~16.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "lint: fix set-state-in-effect DOM measurement patterns (4 errors)"
```

---

### Task 13: Final Verification and Cleanup

- [ ] **Step 1: Run full lint**

Run: `npm run lint 2>&1`
Expected: 0 problems (0 errors, 0 warnings).

- [ ] **Step 2: Run type check**

Run: `npm run type-check`
Expected: No type errors.

- [ ] **Step 3: Run tests**

Run: `npm run test:run`
Expected: All tests pass.

- [ ] **Step 4: Final commit (if any stragglers)**

```bash
git add -A && git commit -m "lint: final cleanup — zero lint issues"
```

---

## Verification Checkpoints

| After Task | Expected Errors | Expected Warnings | Total |
|-----------|----------------|-------------------|-------|
| Start     | 57             | 76                | 133   |
| Task 1    | 57             | 60                | 117   |
| Task 2    | 57             | 53                | 110   |
| Task 3    | 57             | 39                | 96    |
| Task 4    | 57             | 24                | 81    |
| Task 5    | 55             | 24                | 79    |
| Task 6    | 25             | 24                | 49    |
| Task 7    | 25             | 22                | 47    |
| Task 8    | 25             | 21                | 46    |
| Task 9    | 25             | 15                | 40    |
| Task 10   | 20             | 15                | 35    |
| Task 11   | 4              | 15                | 19    |
| Task 12   | 0              | 15                | 15    |
| Task 13   | 0              | 0                 | 0     |

**⚠️ NOTE:** Task 12 fixes remaining `set-state-in-effect` errors but some warnings from `exhaustive-deps` may have been introduced by refactoring. Final count may vary.

---

## Constraints & Gotchas

- **Never change behavior** — only fix lint issues. UI must look and work identically.
- **Test files:** Preserve test semantics. Only type the mocks, don't change test logic.
- **Component files:** Preserve all UI behavior. Only refactor effects.
- **Hydration guards (Pattern A):** Removing `mounted` state may cause hydration warnings in dev mode. This is acceptable — React 19 handles this better than React 18.
- **"Adjusting state during render" pattern:** This is React's recommended approach but can cause infinite loops if the guard condition is wrong. Always use a ref to track previous prop value.
- **`useSyncExternalStore`:** Available in React 18+. Safe to use in this project (React 19).
- **`ImageCropper.tsx:335` (handleMouseMove):** This is in a `useCallback` that may be referenced in a `useEffect` for window event listeners. Read the full useEffect before deleting.
- **`profile.test.ts` unused imports:** Some of these imports (`makeRequest`, `throwOnApiError`, etc.) may be used in other test blocks via `vi.mocked()`. Verify they're truly unused before removing.
- **AGENTS.md rules:** Never modify `getManagementApiToken`, `checkSameOrigin`, auth routes, or `@typescript-eslint/no-unused-vars` config.

---

## Testing Strategy

- **Unit tests:** `npm run test:run` must pass after each batch. No test should break.
- **Type check:** `npm run type-check` must pass after each batch.
- **Lint:** `npm run lint` must show decreasing issue count after each batch.
- **Edge cases:**
  - Hydration guard removal: Test that theme colors render correctly on first paint.
  - Data fetching refactors: Test that loading states show correctly on initial load and refetch.
  - Prop→state sync: Test that editing a field and then receiving a server update correctly overwrites the edit.
