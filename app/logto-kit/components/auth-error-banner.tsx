'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Known OAuth2/OIDC error codes that are safe to display verbatim.
 * Any error not in this set is replaced with a generic fallback to prevent
 * social engineering attacks that inject attacker-controlled messages via
 * the auth_error query parameter.
 */
const KNOWN_OAUTH_ERRORS = new Set([
  'access_denied',
  'login_required',
  'interaction_required',
  'consent_required',
  'invalid_request',
  'unauthorized_client',
  'unsupported_response_type',
  'invalid_scope',
  'server_error',
  'temporarily_unavailable',
]);

/**
 * Displays an OAuth authentication error banner when `auth_error` is present in the URL.
 *
 * OAuth2 error codes are standardized enum values (e.g., access_denied, login_required,
 * interaction_required) and are safe to display. The error_description is intentionally
 * NOT shown to avoid reflecting user-controlled content from the IdP.
 */
export function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const authError = searchParams.get('auth_error');

  // Derive the safe error code without state — useMemo is sufficient because
  // authError comes from searchParams which is a stable reference per navigation.
  const activeError = useMemo(() => {
    if (!authError) return null;
    return KNOWN_OAUTH_ERRORS.has(authError) ? authError : 'authentication_error';
  }, [authError]);

  if (!activeError) {
    return null;
  }

  return (
    // key ensures AuthErrorBannerInner remounts (resetting dismissed) when error changes
    <AuthErrorBannerInner
      key={activeError}
      authError={activeError}
    />
  );
}

function AuthErrorBannerInner({
  authError,
}: {
  authError: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Automatically clear auth_error parameter from URL after display
    const params = new URLSearchParams(searchParams.toString());
    if (params.has('auth_error')) {
      params.delete('auth_error');
      const newQuery = params.toString();
      router.replace(newQuery ? `?${newQuery}` : window.location.pathname);
    }
  }, [searchParams, router]);

  if (dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        margin: '0.75rem 1rem 0',
        borderRadius: '0.5rem',
        background: 'var(--ldd-error-bg, #fef2f2)',
        border: '1px solid var(--ldd-error-border, #fecaca)',
        color: 'var(--ldd-error-text, #991b1b)',
        fontSize: '0.875rem',
        lineHeight: '1.25rem',
      }}
    >
      <AlertTriangle
        size="1rem"
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      />
      <span style={{ flex: 1 }}>
        Authentication error: <strong>{authError}</strong>
      </span>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss error"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.25rem',
          borderRadius: '0.25rem',
          color: 'inherit',
          opacity: 0.7,
        }}
      >
        <X size="0.875rem" aria-hidden="true" />
      </button>
    </div>
  );
}
