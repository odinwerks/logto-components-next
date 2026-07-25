'use client';

import { useState, useCallback, useRef, useEffect, useId, Suspense } from 'react';
import type { UserData, UserRole, PersonalPermission } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import { FONT_SANS, FONT_MONO } from '../../../themes';
import type { Translations } from '../../../locales';
import { Pencil, X, Mail, Phone, Check, Camera, Trash2, Image as ImageIcon, Info } from 'lucide-react';
import { createPortal } from 'react-dom';
import { UserBadge } from '../../UserButton';
import { readEnv } from '../../../logic/env';
import { useAvatarUpload } from '../../../hooks/use-avatar-upload';
import type { ActionResult, DataResult } from '../../../logic/actions/safe';
import { Button } from '../../shared/Button';
import { Input } from '../../shared/Input';
import { ContactRow, Card, HR } from '../shared/ContactRow';
import { RoleCard } from '../shared/RoleCard';
import { RefreshButton } from '../shared/RefreshButton';
import { Overlay, PasswordVerifyModal, type PasswordModalStep } from '../shared/FlowModal';
import { ImageCropper, type ImageCropperRef } from '../shared/ImageCropper';
import { motion, AnimatePresence, BouncingDots } from '../../shared/motion';
import { usePersonalRoles } from '../../../hooks/use-personal-roles';
import { usePersonalPermissions } from '../../../hooks/use-personal-permissions';
import { useFocusTrap } from '../shared/focus-trap';
import { PersonalRolesStream, PersonalPermissionsStream } from '../shared/rbac-streams';

interface AvatarModalWrapperProps {
  children: (ref: React.RefObject<HTMLDivElement | null>) => React.ReactNode;
  onClose: () => void;
}

function AvatarModalWrapper({ children, onClose }: AvatarModalWrapperProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onClose);
  return <>{children(dialogRef)}</>;
}

const UploadIcon = ({ size = 1, color = 'currentColor' }) => (
  <svg width={`${size}rem`} height={`${size}rem`} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const CheckIcon = ({ size = 0.875, color = 'currentColor' }) => (
  <svg width={`${size}rem`} height={`${size}rem`} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);



// ─── PersonalPermissionsBlock - refreshable wrapper for personal (global RBAC)
//     permissions. Powered by usePersonalPermissions hook. ───
interface PersonalPermissionsBlockProps {
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  /**
   * Optional pre-fetched permissions streamed from the RSC
   * (`personalRbacPromise`). When provided, the hook seeds its state and
   * skips the mount-effect fetch; `refresh()` still works.
   */
  initialData?: PersonalPermission[];
}

const PersonalPermissionsBlock = ({ mode, colors, t, initialData }: PersonalPermissionsBlockProps) => {
  const c = colors;
  const {
    permissions,
    loading,
    error,
    refresh,
    activePermission,
    tooltip,
    getTooltipHandlers,
  } = usePersonalPermissions(initialData);

  const showTooltip = tooltip.visible && activePermission !== null;

  const sectionLabel: React.CSSProperties = {
    fontFamily: FONT_SANS,
    fontWeight: 500,
    fontSize: '0.6875rem',
    color: c.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: 0,
  };

  const wellStyle: React.CSSProperties = {
    background: c.bgSecondary,
    border: `1px solid ${c.borderColor}`,
    padding: '1rem 1.25rem',
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    marginBottom: 0,
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <p style={sectionLabel}>{t.profile.personalPermissionsDesc}</p>
          <RefreshButton
            onClick={refresh}
            loading={loading}
            colors={colors}
            ariaLabel={t.profile.refreshPersonalPermissions}
          />
        </div>
        <div style={wellStyle}>
          {loading ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.6875rem', color: c.textTertiary }}>
              <BouncingDots size={6} gap={3} color={c.textTertiary} ariaLabel={t.profile.loadingPermissions} /> {t.profile.loadingPermissions}
            </div>
          ) : error ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.6875rem', color: c.accentRed }}>
              {t.profile.permissionsError}
            </div>
          ) : permissions.length === 0 ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.6875rem', color: c.textTertiary }}>
              {t.profile.noPersonalPermissions}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {permissions.map((perm) => {
                const handlers = getTooltipHandlers(perm);
                return (
                  <div
                    key={`${perm.resourceIndicator}:${perm.scope}`}
                    style={{
                      padding: '0.5rem 0.75rem',
                      background: c.bgPrimary,
                      border: `1px solid ${c.borderColor}`,
                      borderRadius: '0.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <span style={{ fontFamily: FONT_MONO, fontSize: '0.6875rem', color: c.textPrimary, fontWeight: 600 }}>
                      {perm.scope}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textTertiary, textAlign: 'right' }}>
                        {t.profile.resourceLabel}: {perm.resourceName}
                      </span>
                      <button
                        type="button"
                        {...handlers}
                        aria-label={`Permission details for ${perm.scope}`}
                        style={{
                          cursor: 'help',
                          color: c.textTertiary,
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          margin: 0,
                        }}
                      >
                        <Info size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {showTooltip && activePermission && createPortal(
        <div style={{
          position: 'fixed',
          top: tooltip.y,
          left: tooltip.x,
          background: c.bgSecondary,
          border: `1px solid ${c.borderColor}`,
          borderRadius: '0.25rem',
          padding: '0.5rem 0.625rem',
          minWidth: '14rem',
          maxWidth: '18rem',
          boxShadow: mode === 'dark'
            ? '0 2px 8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 2px 8px rgba(0, 0, 0, 0.15)',
          zIndex: 4000,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textSecondary }}>
            <span style={{ color: c.textTertiary }}>Permission: </span>
            {activePermission.scope}
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textSecondary }}>
            <span style={{ color: c.textTertiary }}>{t.profile.resourceLabel}: </span>
            {activePermission.resourceName}
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textSecondary }}>
            <span style={{ color: c.textTertiary }}>Resource Indicator: </span>
            {activePermission.resourceIndicator}
          </div>
          {activePermission.description && (
            <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textSecondary }}>
              <span style={{ color: c.textTertiary }}>Description: </span>
              {activePermission.description}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

// ─── PersonalRolesList — extracted from the inline roles card so it can be
//     wrapped by `PersonalRolesStream` and seeded with the streamed roles
//     as `initialData` (instant-fetch). The hook still handles `refresh()`
//     and the loading/error/empty states. ───

interface PersonalRolesListProps {
  userId: string;
  initialRoles?: UserRole[];
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
}

const PersonalRolesList = ({ userId, initialRoles, mode, colors, t }: PersonalRolesListProps) => {
  const c = colors;
  const {
    roles: userRoles,
    loading: rolesLoading,
    error: rolesError,
    refresh: refreshRoles,
  } = usePersonalRoles(userId, initialRoles);

  const sectionLabel: React.CSSProperties = {
    fontFamily: FONT_SANS,
    fontWeight: 500,
    fontSize: '0.6875rem',
    color: c.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: 0,
  };

  const wellStyle: React.CSSProperties = {
    background: c.bgSecondary,
    border: `1px solid ${c.borderColor}`,
    padding: '1rem 1.25rem',
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    marginBottom: 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <p style={sectionLabel}>{t.profile.rolesDescription}</p>
        <RefreshButton
          onClick={refreshRoles}
          loading={rolesLoading}
          colors={colors}
          ariaLabel={t.profile.refreshRoles}
        />
      </div>
      <div style={wellStyle}>
        {rolesLoading ? (
          <div style={{ padding: '2rem 0', textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.6875rem', color: c.textTertiary }}>
            <BouncingDots size={6} gap={3} color={c.textTertiary} ariaLabel={t.profile.loading} /> {t.profile.loading}
          </div>
        ) : rolesError ? (
          <div style={{ padding: '2rem 0', textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.6875rem', color: c.accentRed }}>
            {t.profile.rolesError}
          </div>
        ) : userRoles.length === 0 ? (
          <div style={{ padding: '2rem 0', textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.6875rem', color: c.textTertiary }}>
            {t.profile.noRoles}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {userRoles.map((role) => (
              <RoleCard
                key={role.id}
                name={role.name}
                roleId={role.id}
                description={role.description}
                colors={colors}
                t={t}
                mode={mode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};



interface ProfileTabProps {
  userData:          UserData;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t:                 Translations;
  countryFilter?: { mode: 'allow' | 'block' | 'none'; codes: string[] };
  mobmode?: number;
  nameType?: string;
  onUpdateBasicInfo: (updates: { name?: string; username?: string }, identityVerificationRecordId?: string) => Promise<ActionResult>;
  onUpdateAvatarUrl: (avatarUrl: string) => Promise<ActionResult>;
  onUpdateProfile:   (profile: { givenName?: string; familyName?: string }) => Promise<ActionResult>;
  onVerifyPassword: (password: string) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onSendEmailVerification: (email: string) => Promise<DataResult<{ verificationId: string }>>;
  onSendPhoneVerification: (phone: string) => Promise<DataResult<{ verificationId: string }>>;
  onVerifyCode: (type: 'email' | 'phone', value: string, verificationId: string, code: string) => Promise<DataResult<{ verificationRecordId: string }>>;
  onUpdateEmail: (email: string | null, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string) => Promise<ActionResult>;
  onUpdatePhone: (phone: string, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string) => Promise<ActionResult>;
  onRemoveEmail: (identityVerificationRecordId: string) => Promise<ActionResult>;
  onRemovePhone: (identityVerificationRecordId: string) => Promise<ActionResult>;
  onSuccess:         (message: string) => void;
  onError:           (message: string) => void;
  refreshData:       () => void;
}

export function ProfileTab({
  userData, mode, colors, t, countryFilter, mobmode, nameType: nameTypeProp,
  onUpdateBasicInfo, onUpdateAvatarUrl, onUpdateProfile,
  onVerifyPassword, onSendEmailVerification, onSendPhoneVerification,
  onVerifyCode, onUpdateEmail, onUpdatePhone, onRemoveEmail, onRemovePhone,
  onSuccess, onError, refreshData,
}: ProfileTabProps) {
  const isMobile = mobmode === 1;
  const isDark = mode === 'dark';
  const usernameId = useId();
  const firstNameId = useId();
  const lastNameId = useId();
  const c = colors;
  const ty = {
    fontSans: "'DM Sans', system-ui, sans-serif",
    size: { micro: '0.5625rem', xs: '0.625rem', sm: '0.6875rem', base: '0.75rem', md: '0.8125rem', lg: '0.875rem', xl: '0.9375rem' },
    weight: { medium: 500, semibold: 600 },
  };
  const cs = {
    surfaces: {
      dropZone: { border: `1.5px dashed ${c.borderColor}`, borderRadius: '0.375rem', background: 'transparent', padding: '1.5rem' } as React.CSSProperties,
      dropZoneActive: { border: `1.5px dashed ${c.accentBlue}`, background: `${c.accentBlue}0d` } as React.CSSProperties,
      well: { background: c.bgSecondary, border: `1px solid ${c.borderColor}cc`, borderRadius: '0.375rem', padding: '1rem 1.25rem' } as React.CSSProperties,
    },
    inputs: {
      label: { display: 'block', fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontWeight: 500, fontSize: '0.625rem', color: c.textTertiary, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '0.4375rem' } as React.CSSProperties,
    },
    text: {
      mutedMono: { fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: '0.6875rem', color: c.textTertiary } as React.CSSProperties,
    },
  };

  const _rawNameType = nameTypeProp ?? 'given_family';
  const nameType: 'given_family' | 'username' | 'full' =
    (_rawNameType === 'given_family' || _rawNameType === 'username' || _rawNameType === 'full')
      ? _rawNameType
      : 'given_family';

  const [givenName,   setGivenName]   = useState(userData.profile?.givenName  ?? '');
  const [familyName,  setFamilyName]  = useState(userData.profile?.familyName ?? '');
  const [username,    setUsername]    = useState(userData.username ?? '');
  const [nameLoading, setNameLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // MCP-001c: Password verification gate for username/full name updates.
  // Logto requires identity verification (logto-verification-id header) for
  // username changes, so we open a PasswordVerifyModal before handleSaveName
  // when nameType is 'username' or 'full'. The 'given_family' mode does NOT
  // send a username, so it skips the verification gate.
  const [nameVerifyStep, setNameVerifyStep] = useState<PasswordModalStep | null>(null);
  const [nameVerifyError, setNameVerifyError] = useState('');
  const [nameVerifyLoading, setNameVerifyLoading] = useState(false);

  // Note: `usePersonalRoles` is NOT called at the top of `ProfileTab` anymore.
  // It now lives inside `PersonalRolesList` (extracted), which is wrapped by
  // `<PersonalRolesStream>` so the streamed `personalRbacPromise` seeds the
  // hook's `initialData` and skips the mount-effect fetch (instant-fetch).

  const handleSaveName = useCallback(async (verificationRecordId?: string) => {
    setNameLoading(true);
    try {
      if (nameType === 'given_family') {
        const name = `${givenName} ${familyName}`.trim();
        // Always send name (as '' when both fields are cleared) so the server can
        // clear userData.name. The previous falsy guard skipped the call, leaving
        // the name stale when both given and family names were emptied.
        // given_family mode does NOT send username, so no verification ID needed.
        const basicResult = await onUpdateBasicInfo({ name: name || '' });
        if (!basicResult.ok) { onError(basicResult.error); refreshData(); return; }
        const profileResult = await onUpdateProfile({ givenName, familyName });
        if (!profileResult.ok) {
          // Attempt rollback of name update since profile update failed
          try {
            const rollbackUpdates: { name?: string } = {};
            if (userData.name != null) rollbackUpdates.name = userData.name;
            const rollbackResult = await onUpdateBasicInfo(rollbackUpdates);
            if (!rollbackResult.ok) {
              console.warn('[ProfileTab] Rollback failed:', rollbackResult.error);
              refreshData();
            }
          } catch (err) {
            console.warn('[ProfileTab] Rollback failed with exception:', err);
            refreshData();
          }
          onError(profileResult.error);
          return;
        }
      } else if (nameType === 'username') {
        // MCP-001c: username changes require the logto-verification-id header.
        const result = await onUpdateBasicInfo({ username }, verificationRecordId);
        if (!result.ok) { onError(result.error); refreshData(); return; }
      } else { // full
        const nameFieldsChanged =
          givenName  !== (userData.profile?.givenName  ?? '') ||
          familyName !== (userData.profile?.familyName ?? '');
        const name = `${givenName} ${familyName}`.trim();
        // Always include name (as '' when both fields are cleared) so the server can
        // clear userData.name. The previous conditional omitted the key when name
        // was empty, leaving the name stale.
        // MCP-001c: username is always included in full mode, so the verification
        // ID is forwarded to the server action (and to any rollback that includes
        // a username restore).
        const basicUpdates: { name: string; username: string } = { name: name || '', username };
        const basicResult = await onUpdateBasicInfo(basicUpdates, verificationRecordId);
        if (!basicResult.ok) { onError(basicResult.error); refreshData(); return; }
        if (nameFieldsChanged) {
          const profileResult = await onUpdateProfile({ givenName, familyName });
          if (!profileResult.ok) {
            // Attempt rollback of name/username update since profile update failed
            try {
              const rollbackUpdates: { name?: string; username?: string } = {};
              if (userData.name != null) rollbackUpdates.name = userData.name;
              if (userData.username != null) rollbackUpdates.username = userData.username;
              const rollbackResult = await onUpdateBasicInfo(rollbackUpdates, verificationRecordId);
              if (!rollbackResult.ok) {
                console.warn('[ProfileTab] Rollback failed:', rollbackResult.error);
                refreshData();
              }
            } catch (err) {
              console.warn('[ProfileTab] Rollback failed with exception:', err);
              refreshData();
            }
            onError(profileResult.error);
            return;
          }
        }
      }
      onSuccess(t.profile.profileUpdated);
      setIsEditing(false);
      refreshData();
    } finally {
      setNameLoading(false);
    }
  }, [nameType, givenName, familyName, username, userData, onUpdateBasicInfo, onUpdateProfile, onSuccess, onError, refreshData, t]);

  // MCP-001c: Gate the save action behind password verification when the name
  // type includes a username field. 'given_family' does NOT send username and
  // therefore skips the verification modal entirely.
  const handleNameSaveClick = useCallback(() => {
    if (nameType === 'username' || nameType === 'full') {
      setNameVerifyStep({ kind: 'password' });
      setNameVerifyError('');
      setNameVerifyLoading(false);
    } else {
      void handleSaveName(undefined);
    }
  }, [nameType, handleSaveName]);

  const handleNameVerifyPassword = useCallback(async (password: string) => {
    setNameVerifyLoading(true);
    setNameVerifyError('');
    try {
      const result = await onVerifyPassword(password);
      if (!result.ok) {
        setNameVerifyError(result.error);
        setNameVerifyLoading(false);
        return;
      }
      // Verification succeeded — close the modal and proceed with the save,
      // forwarding the identity verification record ID to the server action.
      setNameVerifyStep(null);
      setNameVerifyLoading(false);
      void handleSaveName(result.data.verificationRecordId);
    } catch {
      // BUG-003: PasswordVerifyModal calls onPasswordSubmit without await/.catch.
      // Recover in-place instead of re-throwing (which would cause unhandledrejection
      // and leave the modal stuck on the loading step).
      setNameVerifyError(t.common?.unexpectedError || 'Unexpected error');
      setNameVerifyLoading(false);
    }
  }, [onVerifyPassword, handleSaveName, t]);

  const handleDiscardName = useCallback(() => {
    setGivenName(userData.profile?.givenName  ?? '');
    setFamilyName(userData.profile?.familyName ?? '');
    if (nameType !== 'given_family') setUsername(userData.username ?? '');
    setIsEditing(false);
  }, [userData, nameType]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);
  const cropperRef = useRef<ImageCropperRef>(null);
  const cropPreviewUrlRef = useRef<string | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => { cropPreviewUrlRef.current = cropPreviewUrl; }, [cropPreviewUrl]);

  // BUG-024: Revoke any outstanding object URL when the component unmounts to
  // prevent leaking the blob URL (and its underlying File/Blob memory).
  useEffect(() => () => {
    if (cropPreviewUrlRef.current) {
      URL.revokeObjectURL(cropPreviewUrlRef.current);
      cropPreviewUrlRef.current = null;
    }
  }, []);

  /**
   * Sync server data to local form state.
   *
   * We use the "adjust state during render" pattern (React docs: "You Might Not
   * Need an Effect") to overwrite local edits when server data changes. This is
   * a data-consistency tradeoff: the form always reflects the current server state.
   * User edits that haven't been saved are discarded when data refreshes.
   *
   * This avoids the useEffect + setState lint warning while preserving the same
   * behavior: when a prop changes, local state is synchronously updated during
   * render (no extra render cycle).
   */
  /* eslint-disable react-hooks/refs -- synchronous prop-change reset (React "adjusting state" pattern) */
  const prevUsernameRef = useRef(userData.username);
  if (nameType !== 'given_family' && prevUsernameRef.current !== userData.username) {
    prevUsernameRef.current = userData.username;
    setUsername(userData.username ?? '');
  }

  const prevGivenNameRef = useRef(userData.profile?.givenName);
  if (prevGivenNameRef.current !== userData.profile?.givenName) {
    prevGivenNameRef.current = userData.profile?.givenName;
    setGivenName(userData.profile?.givenName ?? '');
  }

  const prevFamilyNameRef = useRef(userData.profile?.familyName);
  if (prevFamilyNameRef.current !== userData.profile?.familyName) {
    prevFamilyNameRef.current = userData.profile?.familyName;
    setFamilyName(userData.profile?.familyName ?? '');
  }
  /* eslint-enable react-hooks/refs */

  const { upload, isUploading, clearError } = useAvatarUpload({
    userId: userData.id,
    onSuccess: async (url: string) => {
      const result = await onUpdateAvatarUrl(url);
      if (!result.ok) { onError(result.error); return; }
      onSuccess(t.profile.avatarUpdated);
      refreshData();
      setAvatarModalOpen(false);
      if (cropPreviewUrlRef.current) {
        URL.revokeObjectURL(cropPreviewUrlRef.current);
        cropPreviewUrlRef.current = null;
      }
      setCropPreviewUrl(null);
      setSelectedFile(null);
    },
    onError: (message: string) => {
      onError(message);
    },
  });

  const savedAvatarUrl = userData.avatar ?? '';
  const avatarShape = (readEnv('USER_SHAPE') as 'circle' | 'sq' | 'rsq') ?? 'circle';

  const handleFileSelected = useCallback((file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      onError(t.profile.avatarInvalidType);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      onError(t.profile.avatarTooLarge);
      return;
    }
    setSelectedFile(file);
    if (cropPreviewUrl) {
      URL.revokeObjectURL(cropPreviewUrl);
    }
    setCropPreviewUrl(URL.createObjectURL(file));
    clearError();
  }, [onError, t, clearError, cropPreviewUrl]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    e.target.value = '';
  }, [handleFileSelected]);

  const handleRemoveAvatar = useCallback(async () => {
    setAvatarLoading(true);
    try {
      const result = await onUpdateAvatarUrl('');
      if (!result.ok) { onError(result.error); return; }
      onSuccess(t.profile.avatarRemoved);
      refreshData();
      setAvatarModalOpen(false);
    } finally {
      setAvatarLoading(false);
    }
  }, [onUpdateAvatarUrl, onSuccess, onError, refreshData, t]);

  const handleApplyCrop = useCallback(async () => {
    if (!cropperRef.current || !selectedFile) return;
    const blob = await cropperRef.current.cropToBlob();
    if (!blob) {
      onError(t.profile.cropFailed);
      return;
    }
    const croppedFile = new File(
      [blob],
      selectedFile.name.replace(/\.[^.]+$/, '.png'),
      { type: 'image/png' },
    );
    const uploadedUrl = await upload(croppedFile);
    if (!uploadedUrl) {
      // upload() already called onError internally
      return;
    }
  }, [selectedFile, upload, onError, t.profile.cropFailed]);

  const handleCloseModal = useCallback(() => {
    // BUG-035: prevent closing during upload — otherwise success toast fires after user "cancelled"
    if (isUploading) return;
    // Use the ref (not the state) so a stale closure can't double-revoke an
    // already-revoked URL. Nulling the ref acts as the "already revoked" flag.
    if (cropPreviewUrlRef.current) {
      URL.revokeObjectURL(cropPreviewUrlRef.current);
      cropPreviewUrlRef.current = null;
    }
    setCropPreviewUrl(null);
    setSelectedFile(null);
    setAvatarModalOpen(false);
  }, [isUploading]);

  // Focus management: mount focus & focus restoration
  useEffect(() => {
    if (avatarModalOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      if (modalRef.current) {
        modalRef.current.focus();
      }
    } else {
      if (triggerRef.current) {
        triggerRef.current.focus();
        triggerRef.current = null;
      }
    }
  }, [avatarModalOpen]);

  const dropZoneStyle: React.CSSProperties = {
    ...cs.surfaces.dropZone,
    ...(isDragging ? cs.surfaces.dropZoneActive : {}),
    opacity: isUploading ? 0.7 : 1,
    cursor: isUploading ? 'not-allowed' : 'pointer',
  };

  const inCropMode = !!cropPreviewUrl;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AnimatePresence>
      {avatarModalOpen && (
        <AvatarModalWrapper key="avatar-modal" onClose={() => { if (!isUploading) handleCloseModal(); }}>
          {(ref) => (
            <Overlay onDismiss={() => { if (!isUploading) handleCloseModal(); }}>
              <div
                ref={(el) => {
                  // BUG-098: attach both the AvatarModalWrapper ref (for focus-trap) and modalRef
                  (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
                  modalRef.current = el;
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="avatar-modal-title"
                tabIndex={-1}
            style={{
              width: '100%',
              maxWidth: inCropMode ? '42rem' : '32rem',
              background: c.bgSecondary,
              border: `1px solid ${c.borderColor}`,
              boxShadow: mode === 'dark' ? '0 2rem 5.625rem rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)' : '0 2rem 5.625rem rgba(0,0,0,0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transition: 'max-width 0.25s ease',
              outline: 'none',
            }}
          >
            {/* Header - title + delete text + X */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: `1px solid ${c.borderColor}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}>
                <span
                  id="avatar-modal-title"
                  style={{
                    fontFamily: ty.fontSans,
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    color: c.textPrimary,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {inCropMode
                    ? t.profile.adjustPhoto
                    : t.profile.profilePhoto}
                </span>
                {!isMobile && !inCropMode && savedAvatarUrl && (
                  <span style={{
                    fontSize: ty.size.sm,
                    color: c.textTertiary,
                    fontFamily: ty.fontSans,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}>
                    {t.profile.deletePfpPrefix}{' '}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!avatarLoading && !isUploading) handleRemoveAvatar();
                      }}
                      disabled={avatarLoading || isUploading}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: avatarLoading || isUploading ? 'not-allowed' : 'pointer',
                        color: c.accentRed,
                        fontWeight: ty.weight.semibold,
                        fontSize: 'inherit',
                        fontFamily: 'inherit',
                        textDecoration: 'underline',
                        opacity: avatarLoading || isUploading ? 0.5 : 1,
                      }}
                    >
                      {t.profile.deletePfpHighlight}
                    </button>
                    {' '}{t.profile.deletePfpSuffix}
                  </span>
                )}
              </div>
              <button
                onClick={() => { if (!isUploading) handleCloseModal(); }}
                aria-label="Close modal"
                disabled={isUploading}
                style={{ background: 'none', border: 'none', cursor: isUploading ? 'not-allowed' : 'pointer', color: c.textTertiary, padding: '0.25rem', display: 'flex', opacity: isUploading ? 0.5 : 1 }}
              >
                <X size={18} strokeWidth={1.5} />
              </button>
</div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />

            {!inCropMode ? (
              isMobile ? (
                /* ── Upload mode (mobile): 3-button layout ── */
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {savedAvatarUrl && (
                    <button
                      onClick={(e) => { e.stopPropagation(); if (!avatarLoading && !isUploading) handleRemoveAvatar(); }}
                      disabled={avatarLoading || isUploading}
                      style={{
                        width: '100%', padding: '0.75rem 1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        background: c.errorBg, border: `1px solid ${isDark ? '#ef444459' : '#dc262659'}`,
                        borderRadius: '0.375rem', cursor: avatarLoading || isUploading ? 'not-allowed' : 'pointer',
                        color: c.accentRed, fontFamily: ty.fontSans, fontWeight: 500, fontSize: ty.size.sm,
                        opacity: avatarLoading || isUploading ? 0.5 : 1,
                      }}
                    >
                      <Trash2 size={16} strokeWidth={1.5} /> {t.profile.removeAvatar}
                    </button>
                  )}
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    style={{
                      width: '100%', padding: '0.75rem 1rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      background: c.bgTertiary, border: `1px solid ${c.borderColor}`,
                      borderRadius: '0.375rem', cursor: 'pointer',
                      color: c.textSecondary, fontFamily: ty.fontSans, fontWeight: 500, fontSize: ty.size.sm,
                    }}
                  >
                    <Camera size={16} strokeWidth={1.5} /> {t.profile.takePicture}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%', padding: '0.75rem 1rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      background: c.bgTertiary, border: `1px solid ${c.borderColor}`,
                      borderRadius: '0.375rem', cursor: 'pointer',
                      color: c.textSecondary, fontFamily: ty.fontSans, fontWeight: 500, fontSize: ty.size.sm,
                    }}
                  >
                    <ImageIcon size={16} strokeWidth={1.5} /> {t.profile.chooseFromGallery}
                  </button>
                </div>
              ) : (
                /* ── Upload mode (desktop): full-width drop zone ── */
                <div style={{ padding: '1.5rem' }}>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleFileSelected(f);
                    }}
                    onClick={(_e) => {
                      if (!isUploading) fileInputRef.current?.click();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!isUploading) fileInputRef.current?.click();
                      }
                    }}
                    style={{
                      ...dropZoneStyle,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      minHeight: '12.5rem',
                      borderRadius: '0.375rem',
                    }}
                  >
                    <UploadIcon size={2.5} color={c.textTertiary} />
                    <div style={{ textAlign: 'center' }}>
                      <p style={{
                        margin: 0,
                        fontSize: ty.size.md,
                        color: c.textSecondary,
                        fontFamily: ty.fontSans,
                        fontWeight: ty.weight.medium,
                      }}>
                        {t.profile.dragDrop}{' '}
                        <span style={{ color: c.accentBlue, textDecoration: 'underline', pointerEvents: 'none' }}>
                          {t.profile.browse}
                        </span>
                      </p>
                      <p style={{ margin: '0.375rem 0 0', ...cs.text.mutedMono }}>
                        PNG · JPEG · WebP · GIF · max 2 MB
                      </p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* ── Crop mode: large cropper + controls ── */
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                <ImageCropper
                  ref={cropperRef}
                  imageUrl={cropPreviewUrl!}
                  displaySize={380}
                  userShape={avatarShape}
                  mode={mode} colors={colors}
                />

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
                  <Button
                    variant="primary"
                    onClick={handleApplyCrop}
                    disabled={isUploading}
                    mode={mode} colors={colors}
                  >
                    {isUploading ? (
                      <><BouncingDots size={5} gap={3} color={c.contrastText} ariaLabel="" /> {t.profile.loading}</>
                    ) : (
                      <><CheckIcon size={0.8125} color={c.contrastText} /> {t.profile.applyCrop}</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Overlay>
          )}
        </AvatarModalWrapper>
      )}
      </AnimatePresence>

      {/* MCP-001c: Password verification gate for username/full name updates.
          Logto requires identity verification for username changes, so we
          prompt for the user's password before forwarding the save. */}
      <AnimatePresence>
      {nameVerifyStep && (
        <PasswordVerifyModal
          key="name-verify"
          title={t.sessions.verifyToView}
          subtitle={t.security.enterCurrentPassword}
          step={nameVerifyStep}
          onPasswordSubmit={handleNameVerifyPassword}
          onClose={() => {
            setNameVerifyStep(null);
            setNameVerifyError('');
            setNameVerifyLoading(false);
          }}
          passwordError={nameVerifyError}
          loading={nameVerifyLoading}
          mode={mode}
          colors={colors}
          t={t}
        />
      )}
      </AnimatePresence>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', width: '6rem', height: '6rem', flexShrink: 0 }}>
            <UserBadge
              Canvas={savedAvatarUrl ? 'Avatar' : 'Initials'}
              Size="6rem"
              shape={avatarShape}
              userData={{
                ...userData,
                profile: { givenName, familyName },
                avatar: savedAvatarUrl || undefined,
              }}
            />
            {isUploading && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.55)',
              }}>
                <BouncingDots size={8} gap={4} color={c.contrastText} ariaLabel={t.profile.loading} />
              </div>
            )}

            <button
              onClick={() => setAvatarModalOpen(true)}
              disabled={isUploading}
              aria-label={t.profile.changePhoto}
              title={t.profile.changePhoto}
              style={{
                position: 'absolute', bottom: '-0.25rem', right: '-0.25rem',
                width: '1.625rem', height: '1.625rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: c.bgSecondary, border: `1px solid ${c.borderColor}`,
                borderRadius: '0.25rem',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                opacity: isUploading ? 0.5 : 1,
                color: c.textSecondary,
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                padding: 0,
              }}
            >
              <Pencil size={12} strokeWidth={1.5} />
            </button>
          </div>

          <div style={{ ...cs.surfaces.well, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', gap: '0.75rem' }}>
            {!isMobile ? (
              <>
                {/* Desktop: Username-only mode */}
                {nameType === 'username' && (
                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'flex-end' }}>
                    <motion.div
                      layout
                      transition={{ duration: 0.1, ease: 'easeOut' }}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      <div style={{ width: '100%' }}>
                        <label htmlFor={usernameId} style={{ ...cs.inputs.label, marginBottom: '0.25rem', display: 'block' }}>{t.profile.username}</label>
                        <Input
                          id={usernameId}
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          readOnly={!isEditing}
                          placeholder={t.profile.usernamePlaceholder}
                          mode={mode} colors={colors}
                          style={{ padding: '0.375rem 0.75rem', width: '100%' }}
                        />
                      </div>
                    </motion.div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      {isEditing ? (
                        <>
                          <Button variant="secondary" onClick={handleDiscardName} disabled={nameLoading} mode={mode} colors={colors} style={{ padding: '0.375rem 0.875rem' }}>
                            {t.profile.discard}
                          </Button>
                          <Button variant="primary" onClick={handleNameSaveClick} disabled={nameLoading} mode={mode} colors={colors} style={{ padding: '0.375rem 0.875rem', position: 'relative' }}>
                            <span style={{ visibility: nameLoading ? 'hidden' : 'visible' }}>{t.profile.modify}</span>
                            {nameLoading && (
                              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BouncingDots size={5} gap={3} color="#fff" ariaLabel="" />
                              </span>
                            )}
                          </Button>
                        </>
                      ) : (
                        <Button variant="secondary" onClick={() => setIsEditing(true)} mode={mode} colors={colors}>
                          {t.profile.edit}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Desktop: Given/Family mode */}
                {nameType === 'given_family' && (
                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'flex-end' }}>
                    <motion.div
                      layout
                      transition={{ duration: 0.1, ease: 'easeOut' }}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', alignItems: 'flex-start', width: '100%' }}>
                        <label htmlFor={firstNameId} style={{ ...cs.inputs.label, marginBottom: '0.25rem' }}>{t.profile.firstName}</label>
                        <label htmlFor={lastNameId} style={{ ...cs.inputs.label, marginBottom: '0.25rem' }}>{t.profile.lastName}</label>
                        <Input
                          id={firstNameId}
                          value={givenName}
                          onChange={e => setGivenName(e.target.value)}
                          readOnly={!isEditing}
                          placeholder={t.profile.firstNamePlaceholder}
                          mode={mode} colors={colors}
                          style={{ padding: '0.375rem 0.75rem' }}
                        />
                        <Input
                          id={lastNameId}
                          value={familyName}
                          onChange={e => setFamilyName(e.target.value)}
                          readOnly={!isEditing}
                          placeholder={t.profile.lastNamePlaceholder}
                          mode={mode} colors={colors}
                          style={{ padding: '0.375rem 0.75rem' }}
                        />
                      </div>
                    </motion.div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      {isEditing ? (
                        <>
                          <Button variant="secondary" onClick={handleDiscardName} disabled={nameLoading} mode={mode} colors={colors} style={{ padding: '0.375rem 0.875rem' }}>
                            {t.profile.discard}
                          </Button>
                          <Button variant="primary" onClick={handleNameSaveClick} disabled={nameLoading} mode={mode} colors={colors} style={{ padding: '0.375rem 0.875rem', position: 'relative' }}>
                            <span style={{ visibility: nameLoading ? 'hidden' : 'visible' }}>{t.profile.modify}</span>
                            {nameLoading && (
                              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BouncingDots size={5} gap={3} color="#fff" ariaLabel="" />
                              </span>
                            )}
                          </Button>
                        </>
                      ) : (
                        <Button variant="secondary" onClick={() => setIsEditing(true)} mode={mode} colors={colors}>
                          {t.profile.edit}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Desktop: Full mode — username + given/family + vertical button stack */}
                {nameType === 'full' && (
                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'flex-end' }}>
                    <motion.div
                      layout
                      transition={{ duration: 0.1, ease: 'easeOut' }}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* Username field */}
                        <div style={{ width: '100%' }}>
                          <label htmlFor={usernameId} style={{ ...cs.inputs.label, marginBottom: '0.25rem', display: 'block' }}>{t.profile.username}</label>
                          <Input
                            id={usernameId}
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            readOnly={!isEditing}
                            placeholder={t.profile.usernamePlaceholder}
                            mode={mode} colors={colors}
                            style={{ padding: '0.375rem 0.75rem', width: '100%' }}
                          />
                        </div>

                        {/* Given/family grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', alignItems: 'flex-start', width: '100%' }}>
                          <label htmlFor={firstNameId} style={{ ...cs.inputs.label, marginBottom: '0.25rem' }}>{t.profile.firstName}</label>
                          <label htmlFor={lastNameId} style={{ ...cs.inputs.label, marginBottom: '0.25rem' }}>{t.profile.lastName}</label>
                          <Input
                            id={firstNameId}
                            value={givenName}
                            onChange={e => setGivenName(e.target.value)}
                            readOnly={!isEditing}
                            placeholder={t.profile.firstNamePlaceholder}
                            mode={mode} colors={colors}
                            style={{ padding: '0.375rem 0.75rem' }}
                          />
                          <Input
                            id={lastNameId}
                            value={familyName}
                            onChange={e => setFamilyName(e.target.value)}
                            readOnly={!isEditing}
                            placeholder={t.profile.lastNamePlaceholder}
                            mode={mode} colors={colors}
                            style={{ padding: '0.375rem 0.75rem' }}
                          />
                        </div>
                      </div>
                    </motion.div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                      {isEditing ? (
                        <>
                          <Button variant="secondary" onClick={handleDiscardName} disabled={nameLoading} mode={mode} colors={colors} style={{ padding: '0.375rem 0.875rem' }}>
                            {t.profile.discard}
                          </Button>
                          <Button variant="primary" onClick={handleNameSaveClick} disabled={nameLoading} mode={mode} colors={colors} style={{ padding: '0.375rem 0.875rem', position: 'relative' }}>
                            <span style={{ visibility: nameLoading ? 'hidden' : 'visible' }}>{t.profile.modify}</span>
                            {nameLoading && (
                              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BouncingDots size={5} gap={3} color="#fff" ariaLabel="" />
                              </span>
                            )}
                          </Button>
                        </>
                      ) : (
                        <Button variant="secondary" onClick={() => setIsEditing(true)} mode={mode} colors={colors}>
                          {t.profile.edit}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Mobile: pen/check morph button + discard X */
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', width: '100%' }}>
                {/* Fields column — always takes remaining space */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(nameType === 'username' || nameType === 'full') && (
                    <Input
                      id={usernameId}
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      readOnly={!isEditing}
                      placeholder={t.profile.usernamePlaceholder}
                      mode={mode} colors={colors}
                      aria-label={t.profile.username}
                      style={{ padding: '0.375rem 0.75rem', width: '100%' }}
                    />
                  )}
                  {(nameType === 'given_family' || nameType === 'full') && (
                    <>
                      <Input
                        id={firstNameId}
                        value={givenName}
                        onChange={e => setGivenName(e.target.value)}
                        readOnly={!isEditing}
                        placeholder={t.profile.firstNamePlaceholder}
                        mode={mode} colors={colors}
                        aria-label={t.profile.firstName}
                        style={{ padding: '0.375rem 0.75rem', width: '100%' }}
                      />
                      <Input
                        id={lastNameId}
                        value={familyName}
                        onChange={e => setFamilyName(e.target.value)}
                        readOnly={!isEditing}
                        placeholder={t.profile.lastNamePlaceholder}
                        mode={mode} colors={colors}
                        aria-label={t.profile.lastName}
                        style={{ padding: '0.375rem 0.75rem', width: '100%' }}
                      />
                    </>
                  )}
                </div>

                {/* Button column — always present, conditionally populated */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
                  {/* Discard button — appears above the action button when editing */}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleDiscardName}
                      disabled={nameLoading}
                      aria-label={t.profile.discard}
                      style={{
                        width: '2rem', height: '2rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: `1px solid ${c.borderColor}`,
                        borderRadius: '0.25rem', cursor: nameLoading ? 'not-allowed' : 'pointer',
                        color: c.textTertiary, padding: 0,
                      }}
                    ><X size={14} /></button>
                  )}

                  {/* Action button — morphs between pen (edit) and check (save) */}
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={handleNameSaveClick}
                      disabled={nameLoading}
                      aria-label={t.profile.modify}
                      style={{
                        width: '2rem', height: '2rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: c.accentBlue,
                        border: `1px solid ${c.accentBlue}`,
                        borderRadius: '0.25rem',
                        cursor: nameLoading ? 'not-allowed' : 'pointer',
                        color: '#fff',
                        padding: 0,
                      }}
                    >
                      {nameLoading ? <BouncingDots size={5} gap={3} color="#fff" ariaLabel={t.profile.loading} /> : <Check size={14} />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      disabled={false}
                      aria-label={t.profile.edit}
                      style={{
                        width: '2rem', height: '2rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent',
                        border: `1px solid ${c.borderColor}`,
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        color: c.textTertiary,
                        padding: 0,
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
      </div>

      <Card mode={mode} colors={colors}>
        <ContactRow
          label={t.security.email}
          Icon={Mail}
          currentValue={userData.primaryEmail}
          type="email"
          placeholder={t.profile.emailPlaceholder}
          hasOtherContact={!!userData.primaryPhone}
          hideEditButtons={isEditing}
          onVerifyPassword={onVerifyPassword}
          onSendVerification={onSendEmailVerification}
          onVerifyCodeAndUpdate={async (value, verificationId, identityVerificationId, code): Promise<ActionResult> => {
            const vr = await onVerifyCode('email', value, verificationId, code);
            if (!vr.ok) return vr;
            const ur = await onUpdateEmail(value, vr.data.verificationRecordId, identityVerificationId);
            if (!ur.ok) return ur;
            refreshData();
            return { ok: true };
          }}
          onRemove={async (id): Promise<ActionResult> => { const r = await onRemoveEmail(id); if (!r.ok) return r; refreshData(); return { ok: true }; }}
          onSuccess={onSuccess} onError={onError} mobmode={mobmode} t={t} mode={mode} colors={colors}
        />
        <HR colors={colors} />
        <ContactRow
          label={t.security.phone}
          Icon={Phone}
          currentValue={userData.primaryPhone}
          type="phone"
          placeholder={t.profile.phonePlaceholder}
          countryFilter={countryFilter}
          hasOtherContact={!!userData.primaryEmail}
          hideEditButtons={isEditing}
          onVerifyPassword={onVerifyPassword}
          onSendVerification={onSendPhoneVerification}
          onVerifyCodeAndUpdate={async (value, verificationId, identityVerificationId, code): Promise<ActionResult> => {
            const vr = await onVerifyCode('phone', value, verificationId, code);
            if (!vr.ok) return vr;
            const ur = await onUpdatePhone(value, vr.data.verificationRecordId, identityVerificationId);
            if (!ur.ok) return ur;
            refreshData();
            return { ok: true };
          }}
          onRemove={async (id): Promise<ActionResult> => { const r = await onRemovePhone(id); if (!r.ok) return r; refreshData(); return { ok: true }; }}
          onSuccess={onSuccess} onError={onError} mobmode={mobmode} t={t} mode={mode} colors={colors}
        />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', flex: 1, minHeight: 0, marginBottom: '40px' }}>
        {/* Personal roles — streamed via `personalRbacPromise` (instant-fetch).
            The <Suspense> boundary shows a BouncingDots fallback while the
            streamed promise is pending; once resolved, the roles seed
            `usePersonalRoles`'s `initialData` and the mount-fetch is skipped. */}
        <Suspense fallback={(
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <p style={{ fontFamily: FONT_SANS, fontWeight: 500, fontSize: '0.6875rem', color: c.textTertiary, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 0 }}>
                {t.profile.rolesDescription}
              </p>
            </div>
            <div style={{ background: c.bgSecondary, border: `1px solid ${c.borderColor}`, padding: '1rem 1.25rem', flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: 0 }}>
              <div style={{ padding: '2rem 0', textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.6875rem', color: c.textTertiary }}>
                <BouncingDots size={6} gap={3} color={c.textTertiary} ariaLabel={t.profile.loading} /> {t.profile.loading}
              </div>
            </div>
          </div>
        )}>
          <PersonalRolesStream
            render={(initialRoles) => (
              <PersonalRolesList
                userId={userData.id}
                initialRoles={initialRoles}
                mode={mode}
                colors={colors}
                t={t}
              />
            )}
          />
        </Suspense>

        {/* Personal permissions — same streamed promise (instant-fetch).
            The hook skips the mount-fetch when `initialData` is provided. */}
        <Suspense fallback={(
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <p style={{ fontFamily: FONT_SANS, fontWeight: 500, fontSize: '0.6875rem', color: c.textTertiary, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 0 }}>
                {t.profile.personalPermissionsDesc}
              </p>
            </div>
            <div style={{ background: c.bgSecondary, border: `1px solid ${c.borderColor}`, padding: '1rem 1.25rem', flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: 0 }}>
              <div style={{ padding: '2rem 0', textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.6875rem', color: c.textTertiary }}>
                <BouncingDots size={6} gap={3} color={c.textTertiary} ariaLabel={t.profile.loadingPermissions} /> {t.profile.loadingPermissions}
              </div>
            </div>
          </div>
        )}>
          <PersonalPermissionsStream
            render={(initialPerms) => (
              <PersonalPermissionsBlock
                mode={mode}
                colors={colors}
                t={t}
                initialData={initialPerms}
              />
            )}
          />
        </Suspense>
      </div>

    </div>
  );
}
