'use client';

import { useCallback, useRef, useId, useState } from 'react';
import { signInUser } from '@/app/logto-kit/logic/actions/auth';
import { Button } from '@/app/logto-kit/components/shared/Button';
import { Overlay } from '@/app/logto-kit/components/dashboard/shared/FlowModal';
import { BouncingDots } from '@/app/logto-kit/components/shared/motion';
import { useLogto } from '@/app/logto-kit/components/providers/logto-provider';
import { useThemeMode, useLangMode } from '@/app/logto-kit/components/providers/preferences';
import { getTranslations } from '@/app/logto-kit/locales';
import type { LocaleCode } from '@/app/logto-kit/locales';
import { AVAILABLE_LOCALES } from '@/app/logto-kit/logic/i18n';
import { useFocusTrap } from '@/app/logto-kit/components/dashboard/shared/focus-trap';
import { useScrollLock } from '@/app/logto-kit/hooks/use-scroll-lock';
import { LogIn } from 'lucide-react';

export interface AuthPromptModalProps {
  routeTo?: string;
  /** Controls button label. 'mandatory' shows "Read Only Mode"; otherwise shows "Cancel". */
  mode?: 'optional' | 'mandatory';
}

export function AuthPromptModal({ routeTo, mode: authMode }: AuthPromptModalProps) {
  const { closeDashboard } = useLogto();
  const { mode: themeMode, colors } = useThemeMode();
  const { lang } = useLangMode();
  const t = getTranslations((AVAILABLE_LOCALES as readonly string[]).includes(lang) ? (lang as LocaleCode) : 'en-US');
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [pending, setPending] = useState(false);

  useFocusTrap(dialogRef, closeDashboard);
  useScrollLock();

  const handleSignIn = useCallback(() => {
    setPending(true);
    signInUser(routeTo).catch(() => {
      setPending(false);
    });
  }, [routeTo]);

  const font = "'DM Sans', system-ui, sans-serif";

  return (
    <Overlay onDismiss={closeDashboard}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        style={{
          width: '100%',
          maxWidth: '27.5rem',
          background: colors.bgSecondary,
          border: `1px solid ${colors.borderColor}`,
          boxShadow: '0 2rem 5rem rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.375rem 1.375rem 1.25rem',
            borderBottom: `1px solid ${colors.borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
          }}
        >
          <p
            id={titleId}
            style={{
              fontFamily: font,
              fontWeight: 600,
              fontSize: '0.9375rem',
              color: colors.textPrimary,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            {t.auth.signInToContinue}
          </p>
          <p
            id={descriptionId}
            style={{
              fontFamily: font,
              fontSize: '0.75rem',
              color: colors.textSecondary,
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            {t.auth.needToSignIn}
          </p>
        </div>

        {/* Actions */}
        <div
          style={{
            padding: '1.25rem 1.375rem',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.5rem',
          }}
        >
          <Button onClick={closeDashboard} mode={themeMode} colors={colors}>
            {authMode === 'mandatory' ? t.auth.readOnlyMode : t.common.cancel}
          </Button>
          <Button
            aria-label={t.auth.ariaSignIn}
            variant="primary"
            onClick={handleSignIn}
            disabled={pending}
            mode={themeMode}
            colors={colors}
          >
            {t.auth.signIn}{' '}
            {pending ? (
              <BouncingDots size={5} gap={3} color={colors.contrastText} ariaLabel="" />
            ) : (
              <LogIn size={'0.75rem'} color={colors.contrastText} strokeWidth={1.5} />
            )}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
