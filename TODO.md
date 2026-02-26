# TODO - Logto Dashboard Tabs

## Backup Codes (High Priority)
- [x] Debug/fix backup codes not showing
  - Fixed by removing deprecated "View existing" backup codes feature
  - The `getBackupCodes` API was deprecated server-side in Logto
  - Removed from security.tsx, client.tsx, and index.tsx

## Account Delete (High Priority)
- [x] Implement account delete feature
  - Added `deleteUserAccount` action in actions.ts
  - Added delete modal with danger styling in security.tsx
  - Requires M2M credentials (LOGTO_M2M_APP_ID, LOGTO_M2M_APP_SECRET)
  - Fixed M2M resource URL from `${endpoint}/api` to `https://default.logto.app/api`

## Password Change (Medium Priority)
- [x] Implement password change feature
  - Added `updateUserPassword` action in actions.ts
  - Added new-password step to FlowModal
  - Two-step flow: verify current password → enter new password

## Custom Data Tab (Low Priority)
- [ ] Remove duplicate theme/language settings
  - Location: `custom-data.tsx:84-191`
  - These settings are duplicated from the dedicated preferences tab

## Notes
- All other tabs (profile, preferences, identities, raw-data, organizations) appear functional
- Backup codes modal code structure is correct - issue is likely in API call or error handling
