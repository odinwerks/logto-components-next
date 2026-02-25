# Logto-Kit Actual Priorities

## Current Status

**Fixed in previous session:**
✅ Duplicate fetch logic consolidated via `makeRequest` helper  
✅ MFA type safety improved (uses `MfaVerificationPayload` instead of `any`)  
✅ Critical endpoint bug fixed (`getCleanEndpoint` uses `logtoConfig.endpoint`)  
✅ `any` types eliminated from components  
✅ All changes committed locally  

**Pending immediate implementation:**

## Phase 1: Core User Experience Features

### 1. Language Handling System
- Client-side locale state with language switch button in UI
- Store/retrieve language preference in `customData.language`
- Apply stored language on login, fallback to ENV/system default
- Add language selector to user button/sidebar

### 2. Theme Switching with Persistence
- Functional theme toggle (Dark/Light variants)
- Store/retrieve theme preference in `customData.theme`
- Apply stored theme on login, fallback to localStorage → ENV → system
- Theme selector integrated with user preferences

### 3. User Button Component
- Proper UI with avatar/name display
- Integrated language + theme selectors
- Triggers preference updates to custom data
- Should be reusable for library packaging

### 4. Custom Data Preference Logic
- Add `updateUserPreferences(theme, language)` server action
- Read preferences in `fetchDashboardData()` and return as part of initial state
- Apply preferences to component initial state (theme, language)

### 5. Environment Integration
- Keep ENV fallbacks for defaults (`LANG_MAIN`, `THEME`)
- Custom data overrides ENV on login
- User preferences persist across sessions via Logto storage

## Phase 2: Polish & Refinement
- Clean up implementation after core features work
- Ensure robust error handling for preference updates
- Optimize performance (memoization, etc.)

## Phase 3: Library Packaging
- Refactor base into library-like package
- Proper user button component export
- Self-service dashboard components export
- Documentation for external users

## What to Ignore (Premature Optimization)
- Creating more API client abstractions (we have `makeRequest`)
- Zod schemas for validation
- Splitting monolithic components
- Shared form components
- Error sanitization system
- API route constants
- Complex state management refactors

## Implementation Order
1. Language system (client state + storage in custom data)
2. Theme persistence (custom data storage)
3. User button with integrated selectors
4. Preference reading on login
5. Polish and package

## Git Commands for This Session
```bash
# Commit the updated TODO and README
git add Todo.md README.md
git commit -m "Update: Rewrite TODO with actual priorities, add silly license notice"

# Push to remote (if needed)
git push
```

> **Note**: The previous TODO was 90% "BS" - focusing on premature optimization over actual functionality. This TODO reflects what actually needs to be built.