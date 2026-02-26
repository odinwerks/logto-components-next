# TODO - Logto Dashboard Tabs

## Backup Codes (High Priority)
- [x] Debug/fix backup codes not showing
  - Fixed by removing deprecated "View existing" backup codes feature
  - The `getBackupCodes` API was deprecated server-side in Logto
  - Removed from security.tsx, client.tsx, and index.tsx

## Account Delete (High Priority)
- [ ] Implement account delete feature
  - Location: `security.tsx:1065-1068` (danger zone)
  - Currently just a placeholder: `onSuccess('Delete account — connect your handler here.')`

## Password Change (Medium Priority)
- [ ] Implement password change feature
  - Location: `security.tsx:877-881`
  - Currently just a placeholder: `onSuccess('Password change — connect your handler here.')`

## Custom Data Tab (Low Priority)
- [ ] Remove duplicate theme/language settings
  - Location: `custom-data.tsx:84-191`
  - These settings are duplicated from the dedicated preferences tab

## Notes
- All other tabs (profile, preferences, identities, raw-data, organizations) appear functional
- Backup codes modal code structure is correct - issue is likely in API call or error handling
