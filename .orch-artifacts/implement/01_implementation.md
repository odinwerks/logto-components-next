## Status: DONE

## Summary
Fixed 5 failing tests in `verification.test.ts` to match the new `cleanPhoneNumber` behavior that preserves the `+` prefix for E.164 compliance.

## Files Modified
- `app/logto-kit/logic/actions/verification.test.ts` - Updated test expectations for phone numbers with `+` prefix

## Test Changes
1. **updatePhoneWithVerification** - "accepts when verificationTimestamp is in the future": Changed expected `phone: '1234567890'` → `phone: '+1234567890'`
2. **updatePhoneWithVerification** - "normalizes formatted phone number": Changed expected `phone: '12345678901'` → `phone: '+12345678901'`
3. **sendPhoneVerificationCode** - "accepts a clean phone number": Changed expected `value: '15555555555'` → `value: '+15555555555'`
4. **sendPhoneVerificationCode** - "normalizes spaces, hyphens, and parentheses": Changed expected `value: '15555555555'` → `value: '+15555555555'`
5. **verifyVerificationCode** - "normalizes and verifies a formatted phone number": Changed expected `value: '15555555555'` → `value: '+15555555555'`

## Tests
- **Total tests**: 54
- **Result**: 54/54 passing

## Commands Run
- `npx vitest run app/logto-kit/logic/actions/verification.test.ts` - All tests pass

## Self-Review Findings
- ✅ All 5 tests with `+` prefix now correctly expect the `+` to be preserved
- ✅ Tests with phone numbers without `+` prefix still work correctly (e.g., '511147839')
- ✅ The test file follows the existing conventions and patterns
