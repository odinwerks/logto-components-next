'use server';

// This module previously exported introspectTokenWithOrg() which was dead code
// (zero callers). Removed to avoid untested, unwrapped server actions.
// If token introspection with org context is needed in the future, implement it
// here wrapped in safeAction and return { ok, data } / { ok, error }.
