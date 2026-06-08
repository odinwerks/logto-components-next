# Lint Findings Verification Report

**Date:** 2026-06-09
**Research artifact:** `.orch-artifacts/research/01_lint_findings.md`
**Method:** Spot-check verification of reported findings by reading actual source files at reported line numbers.

## Status: DONE_WITH_CONCERNS

All 5 specified findings verified as accurate. Two additional issues discovered during spot-check.

---

## Compliance Checklists

### Gate 1: Spec/Plan Compliance
- [x] All specified findings verified against source code
- [x] Line numbers match actual issues
- [x] Rule classifications are correct
- [x] "Why" explanations make sense

### Gate 2: Code Quality
- [x] No false positives in verified findings
- [x] Rule severity classifications match eslint config
- [x] All issues are real and reproducible

---

## Detailed Findings Verification

### ✅ Finding 1: `react-hooks/set-state-in-effect` at profile.tsx:74
- **File:** `app/logto-kit/components/dashboard/tabs/profile.tsx`
- **Line 74:** `setPermissions([]);`
- **Verdict:** ✅ CONFIRMED
- **Why:** Lines 74-76 (`setPermissions([])`, `setLoading(true)`, `setError(false)`) are all setState calls inside a `useEffect` (lines 71-93). This is a valid trigger for `react-hooks/set-state-in-effect`. The rule is active via `next/core-web-vitals`.

### ✅ Finding 2: `@typescript-eslint/no-explicit-any` at Button.tsx:63
- **File:** `app/logto-kit/components/shared/Button.tsx`
- **Line 63:** `const BUTTONS: Record<string, any> = {`
- **Verdict:** ✅ CONFIRMED
- **Why:** The `any` type annotation on the `BUTTONS` record is explicit. The rule is active via `eslint-config-next/typescript`.

### ✅ Finding 3: Unused imports at security.tsx:8
- **File:** `app/logto-kit/components/dashboard/tabs/security.tsx`
- **Line 8:** `import { Check, X, ChevronRight, AlertTriangle, Key, Trash2, Plus, Eye, EyeOff, RefreshCw, Lock, Shield, Fingerprint, Pencil } from 'lucide-react';`
- **Verdict:** ✅ CONFIRMED — 6 unused icons
- **Unused:** `X`, `ChevronRight`, `AlertTriangle`, `Trash2`, `Eye`, `EyeOff`
- **Why:** Grep confirms each icon name appears ONLY on line 8 (import) and nowhere else in the 885-line file body. Used icons (`Check`, `Key`, `Plus`, `RefreshCw`, `Lock`, `Shield`, `Fingerprint`, `Pencil`) appear in JSX throughout the file.

### ✅ Finding 4: `@typescript-eslint/no-unused-vars` at dashboard.ts:6
- **File:** `app/logto-kit/logic/actions/dashboard.ts`
- **Line 6:** `import type { DashboardResult, DashboardSuccess, UserData } from '../types';`
- **Verdict:** ✅ CONFIRMED
- **Why:** `DashboardSuccess` only appears on line 6 (the import). `DashboardResult` is used at lines 83/85, `UserData` at line 104, but `DashboardSuccess` is never referenced in the file body.

### ✅ Finding 5: Unused eslint-disable directive at profile.tsx:92
- **File:** `app/logto-kit/components/dashboard/tabs/profile.tsx`
- **Line 92:** `// eslint-disable-next-line react-hooks/exhaustive-deps`
- **Verdict:** ✅ CONFIRMED — directive is unnecessary
- **Why:** The directive disables `react-hooks/exhaustive-deps` for line 93 (`}, [visible]);`). However, the useEffect (lines 71-93) only uses `visible` (in deps) and stable values: useState setters (`setPermissions`, `setLoading`, `setError`) and an imported function (`loadPersonalPermissions`). The `exhaustive-deps` rule would NOT fire on this dependency array, making the disable directive superfluous.

---

## Additional Findings (discovered during spot-check)

### 🟡 Finding 6: Unused import `Shield` at profile.tsx:8
- **File:** `app/logto-kit/components/dashboard/tabs/profile.tsx`
- **Line 8:** `import { Pencil, X, Mail, Phone, Shield, Check, Camera, Trash2, Image as ImageIcon, Info } from 'lucide-react';`
- **Verdict:** ⚠️ UNREPORTED — `Shield` is imported but never used in profile.tsx
- **Why:** Grep confirms `Shield` only appears on line 8 (import). Other icons from the same import (`Pencil`, `X`, `Mail`, `Phone`, `Check`, `Camera`, `Trash2`, `ImageIcon`, `Info`) are all used in JSX. `Shield` is not. This should have been caught by `@typescript-eslint/no-unused-vars`.

### 🟡 Finding 7: Additional `set-state-in-effect` at profile.tsx:297-299
- **File:** `app/logto-kit/components/dashboard/tabs/profile.tsx`
- **Lines 297-299:** `setUserRoles([])`, `setRolesLoading(true)`, `setRolesError(false)` inside useEffect (lines 294-318)
- **Verdict:** ⚠️ UNREPORTED — same pattern as Finding 1, different useEffect
- **Why:** The useEffect at lines 294-318 has the identical pattern: multiple setState calls at the top of the effect body before an async operation. This would also trigger `react-hooks/set-state-in-effect`.

---

## Summary Table

| # | Finding | File:Line | Rule | Verified |
|---|---------|-----------|------|----------|
| 1 | setState in useEffect | profile.tsx:74 | `react-hooks/set-state-in-effect` | ✅ Yes |
| 2 | Explicit any | Button.tsx:63 | `@typescript-eslint/no-explicit-any` | ✅ Yes |
| 3 | Unused imports (6 icons) | security.tsx:8 | `@typescript-eslint/no-unused-vars` | ✅ Yes |
| 4 | Unused type import | dashboard.ts:6 | `@typescript-eslint/no-unused-vars` | ✅ Yes |
| 5 | Unused eslint-disable | profile.tsx:92 | N/A (unnecessary directive) | ✅ Yes |
| 6 | Unused `Shield` import | profile.tsx:8 | `@typescript-eslint/no-unused-vars` | ⚠️ Unreported |
| 7 | Additional setState in effect | profile.tsx:297 | `react-hooks/set-state-in-effect` | ⚠️ Unreported |

## Verdict

**DONE_WITH_CONCERNS** — All 5 specified findings are accurate. Two additional issues were found during spot-check (unused `Shield` import and a second `set-state-in-effect` instance). The research findings are reliable but not exhaustive. The research artifact should ideally be updated to include findings 6 and 7.
