'use client';

import { useState, useCallback, useRef, useEffect, useReducer } from 'react';
import type { UserData, UserRole, PersonalPermission } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import { FONT_MONO } from '../../../themes';
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
import { Overlay } from '../shared/FlowModal';
import { ImageCropper, type ImageCropperRef } from '../shared/ImageCropper';
import { getClampedTooltipPosition } from '../shared/tooltip-position';
import { useRefreshable } from '../../../hooks/use-refreshable';
import { loadPersonalRoles } from '../../../server-actions/load-personal-roles';
import { loadPersonalPermissions } from '../../../server-actions/load-personal-permissions';

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

const SpinnerIcon = ({ size = 0.875, color = 'currentColor' }) => (
  <svg width={`${size}rem`} height={`${size}rem`} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
      <animateTransform attributeName="transform" type="rotate"
        from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite"/>
    </path>
  </svg>
);


// ─── PersonalPermissionsBlock - refreshable wrapper for personal (global RBAC)
//     permissions. Uses the same pattern as OrganizationsTab's PermissionsBlock. ───

type PermState = {
  permissions: PersonalPermission[];
  loading: boolean;
  error: boolean;
};
type PermAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; data: PersonalPermission[] }
  | { type: 'FETCH_ERROR' };

const permReducer = (state: PermState, action: PermAction): PermState => {
  switch (action.type) {
    case 'FETCH_START':
      return { permissions: [], loading: true, error: false };
    case 'FETCH_SUCCESS':
      return { permissions: action.data, loading: false, error: false };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: true };
  }
};
interface PersonalPermissionsBlockProps {
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  cardStyle?: React.CSSProperties;
}

const PersonalPermissionsBlock = ({ mode, colors, t, cardStyle }: PersonalPermissionsBlockProps) => {
  const c = colors;
  const { visible, triggerRefresh } = useRefreshable();
  const [{ permissions, loading, error }, permDispatch] = useReducer(permReducer, {
    permissions: [], loading: true, error: false,
  });
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [activePerm, setActivePerm] = useState<PersonalPermission | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    permDispatch({ type: 'FETCH_START' });

    loadPersonalPermissions()
      .then(r => {
        if (cancelled) return;
        if (r.ok) permDispatch({ type: 'FETCH_SUCCESS', data: r.data });
        else { console.error('[PersonalPermissionsBlock] Failed:', r.error); permDispatch({ type: 'FETCH_ERROR' }); }
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[PersonalPermissionsBlock] Error:', err);
        permDispatch({ type: 'FETCH_ERROR' });
      });

    return () => { cancelled = true; };
  }, [visible]);

  if (!visible) return null;

  const handlePermMouseEnter = (e: React.MouseEvent, perm: PersonalPermission) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { left, top } = getClampedTooltipPosition({
      left: rect.left,
      top: rect.bottom + 4,
      width: 288,
      height: 120,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
    setTooltipPos({ x: left, y: top });
    setActivePerm(perm);
    setShowTooltip(true);
  };

  const handlePermMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <>
      <Card mode={mode} colors={colors} style={cardStyle}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <p style={{ fontFamily: FONT_MONO, fontSize: '0.6875rem', color: c.textTertiary, margin: 0 }}>
              {t.profile.personalPermissionsDesc}
            </p>
            <RefreshButton
              onClick={triggerRefresh}
              loading={loading}
              colors={colors}
              ariaLabel={t.profile.refreshPersonalPermissions}
            />
          </div>
          {loading ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.6875rem', color: c.textTertiary }}>
              <SpinnerIcon size={0.875} color={c.textTertiary} /> {t.profile.loadingPermissions}
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
              {permissions.map((perm) => (
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
                    <span
                      onMouseEnter={(e) => handlePermMouseEnter(e, perm)}
                      onMouseLeave={handlePermMouseLeave}
                      style={{ cursor: 'help', color: '#666', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <Info size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
      {showTooltip && activePerm && createPortal(
        <div style={{
          position: 'fixed',
          top: tooltipPos.y,
          left: tooltipPos.x,
          background: c.bgSecondary,
          border: `1px solid ${c.borderColor}`,
          borderRadius: '0.25rem',
          padding: '0.5rem 0.625rem',
          minWidth: '14rem',
          maxWidth: '18rem',
          boxShadow: mode === 'dark'
            ? '0 2px 8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 2px 8px rgba(0, 0, 0, 0.15)',
          zIndex: 10000,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textSecondary }}>
            <span style={{ color: c.textTertiary }}>{t.profile.roleIdLabel}: </span>
            {activePerm.scope}
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textSecondary }}>
            <span style={{ color: c.textTertiary }}>{t.profile.resourceLabel}: </span>
            {activePerm.resourceName}
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textSecondary }}>
            <span style={{ color: c.textTertiary }}>Resource Indicator: </span>
            {activePerm.resourceIndicator}
          </div>
          {activePerm.description && (
            <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textSecondary }}>
              <span style={{ color: c.textTertiary }}>Description: </span>
              {activePerm.description}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

type RolesState = {
  userRoles: UserRole[];
  loading: boolean;
  error: boolean;
};
type RolesAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; data: UserRole[] }
  | { type: 'FETCH_ERROR' };

const rolesReducer = (state: RolesState, action: RolesAction): RolesState => {
  switch (action.type) {
    case 'FETCH_START':
      return { userRoles: [], loading: true, error: false };
    case 'FETCH_SUCCESS':
      return { userRoles: action.data, loading: false, error: false };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: true };
  }
};

interface ProfileTabProps {
  userData:          UserData;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t:                 Translations;
  countryFilter?: { mode: 'allow' | 'block' | 'none'; codes: string[] };
  mobmode?: number;
  nameType?: string;
  onUpdateBasicInfo: (updates: { name?: string; username?: string }) => Promise<ActionResult>;
  onUpdateAvatarUrl: (avatarUrl: string) => Promise<ActionResult>;
  onUpdateProfile:   (profile: { givenName?: string; familyName?: string }) => Promise<ActionResult>;
  onVerifyPassword: (password: string) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onSendEmailVerification: (email: string) => Promise<DataResult<{ verificationId: string }>>;
  onSendPhoneVerification: (phone: string) => Promise<DataResult<{ verificationId: string }>>;
  onVerifyCode: (type: 'email' | 'phone', value: string, verificationId: string, code: string) => Promise<DataResult<{ verificationRecordId: string }>>;
  onUpdateEmail: (email: string | null, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string, verificationTimestamp: number) => Promise<ActionResult>;
  onUpdatePhone: (phone: string, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string, verificationTimestamp: number) => Promise<ActionResult>;
  onRemoveEmail: (identityVerificationRecordId: string, verificationTimestamp: number) => Promise<ActionResult>;
  onRemovePhone: (identityVerificationRecordId: string, verificationTimestamp: number) => Promise<ActionResult>;
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

  const [{ userRoles, loading: rolesLoading, error: rolesError }, rolesDispatch] = useReducer(rolesReducer, {
    userRoles: [], loading: true, error: false,
  });
  const [rolesRefreshKey, setRolesRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!userData.id) return;
    rolesDispatch({ type: 'FETCH_START' });
    loadPersonalRoles()
      .then(r => {
        if (cancelled) return;
        if (r.ok) rolesDispatch({ type: 'FETCH_SUCCESS', data: r.data });
        else {
          console.error('[ProfileTab] Failed to load roles:', r.error);
          rolesDispatch({ type: 'FETCH_ERROR' });
        }
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[ProfileTab] Error loading roles:', err);
        rolesDispatch({ type: 'FETCH_ERROR' });
      });
    return () => { cancelled = true; };
  }, [userData.id, rolesRefreshKey]);

  const nameChanged = nameType === 'given_family'
    ? (givenName  !== (userData.profile?.givenName  ?? '') ||
       familyName !== (userData.profile?.familyName ?? ''))
    : nameType === 'username'
      ? username !== (userData.username ?? '')
      : (username !== (userData.username ?? '') ||
         givenName  !== (userData.profile?.givenName  ?? '') ||
         familyName !== (userData.profile?.familyName ?? ''));

  const handleSaveName = useCallback(async () => {
    setNameLoading(true);
    try {
      if (nameType === 'given_family') {
        const name = `${givenName} ${familyName}`.trim();
        if (name) {
          const basicResult = await onUpdateBasicInfo({ name });
          if (!basicResult.ok) { onError(basicResult.error); refreshData(); return; }
        }
        const profileResult = await onUpdateProfile({ givenName, familyName });
        if (!profileResult.ok) {
          // Don't refreshData() here - Step 1 (name) already succeeded server-side,
          // but Step 2 (givenName/familyName) failed. Resetting local state would
          // discard the user's edits with no way to retry. Show the error and let
          // them correct and try again.
          onError(profileResult.error);
          return;
        }
      } else if (nameType === 'username') {
        const result = await onUpdateBasicInfo({ username });
        if (!result.ok) { onError(result.error); refreshData(); return; }
      } else { // full
        const nameFieldsChanged =
          givenName  !== (userData.profile?.givenName  ?? '') ||
          familyName !== (userData.profile?.familyName ?? '');
        const name = `${givenName} ${familyName}`.trim();
        const basicUpdates: { name?: string; username?: string } = { username };
        if (name) basicUpdates.name = name;
        const basicResult = await onUpdateBasicInfo(basicUpdates);
        if (!basicResult.ok) { onError(basicResult.error); refreshData(); return; }
        if (nameFieldsChanged) {
          const profileResult = await onUpdateProfile({ givenName, familyName });
          if (!profileResult.ok) {
            // Same rationale as given_family branch: Step 1 succeeded, don't
            // wipe local state on Step 2 failure - preserve edits for retry.
            onError(profileResult.error);
            return;
          }
        }
      }
      onSuccess(t.profile.profileUpdated);
      refreshData();
    } finally {
      setNameLoading(false);
    }
  }, [nameType, givenName, familyName, username, userData, onUpdateBasicInfo, onUpdateProfile, onSuccess, onError, refreshData, t]);

  const handleDiscardName = useCallback(() => {
    setGivenName(userData.profile?.givenName  ?? '');
    setFamilyName(userData.profile?.familyName ?? '');
    if (nameType !== 'given_family') setUsername(userData.username ?? '');
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
  if (prevUsernameRef.current !== userData.username) {
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
    if (cropPreviewUrl) {
      URL.revokeObjectURL(cropPreviewUrl);
    }
    setCropPreviewUrl(null);
    setSelectedFile(null);
    setAvatarModalOpen(false);
  }, [cropPreviewUrl]);

  const handleCancelCrop = useCallback(() => {
    handleCloseModal();
  }, [handleCloseModal]);

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

  // Unified ESC & Focus Trap handler
  useEffect(() => {
    if (!avatarModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isUploading) {
          handleCloseModal();
        }
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;

        // Get all potentially focusable elements
        const candidates = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]'
          )
        );

        // Filter candidates to exclude hidden file/camera inputs and visually hidden elements
        const focusables = candidates.filter((el) => {
          if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'file') {
            return false;
          }
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return false;
          }
          return el.tabIndex !== -1;
        });

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || document.activeElement === modalRef.current) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [avatarModalOpen, isUploading, handleCloseModal]);

  const dropZoneStyle: React.CSSProperties = {
    ...cs.surfaces.dropZone,
    ...(isDragging ? cs.surfaces.dropZoneActive : {}),
    opacity: isUploading ? 0.7 : 1,
    cursor: isUploading ? 'not-allowed' : 'pointer',
  };

  const inCropMode = !!cropPreviewUrl;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {avatarModalOpen && (
        <Overlay onDismiss={handleCloseModal}>
          <div
            ref={modalRef}
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
                onClick={handleCloseModal}
                aria-label="Close modal"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textTertiary, padding: '0.25rem', display: 'flex' }}
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
                      <><SpinnerIcon size={0.8125} color={c.contrastText} /> {t.profile.loading}</>
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
                <SpinnerIcon size={1.25} color={c.contrastText} />
              </div>
            )}

            <button
              onClick={() => setAvatarModalOpen(true)}
              disabled={isUploading}
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
                {/* Username row - shown in username and full modes */}
                {(nameType === 'username' || nameType === 'full') && (
                  <div style={{ width: '100%' }}>
                    <label style={{ ...cs.inputs.label, marginBottom: '0.25rem', display: 'block' }}>{t.profile.username}</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <Input
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder={t.profile.usernamePlaceholder}
                        mode={mode} colors={colors}
                        style={{ padding: '0.375rem 0.75rem', flex: 1 }}
                      />
                      {nameType === 'username' && nameChanged && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          <Button variant="secondary" onClick={handleDiscardName} disabled={nameLoading} mode={mode} colors={colors} style={{ padding: '0.375rem 0.875rem' }}>
                            {t.profile.discard}
                          </Button>
                          <Button variant="primary" onClick={handleSaveName} disabled={nameLoading} mode={mode} colors={colors} style={{ padding: '0.375rem 0.875rem' }}>
                            {nameLoading ? t.profile.saving : t.profile.saveChanges}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Given/Family grid - shown in given_family and full modes */}
                {(nameType === 'given_family' || nameType === 'full') && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'flex-start', width: '100%' }}>
                    <label style={{ ...cs.inputs.label, marginBottom: '0.25rem' }}>{t.profile.firstName}</label>
                    <label style={{ ...cs.inputs.label, marginBottom: '0.25rem' }}>{t.profile.lastName}</label>
                    <div />
                    <Input
                      value={givenName}
                      onChange={e => setGivenName(e.target.value)}
                      placeholder={t.profile.firstNamePlaceholder}
                      mode={mode} colors={colors}
                      style={{ padding: '0.375rem 0.75rem' }}
                    />
                    <Input
                      value={familyName}
                      onChange={e => setFamilyName(e.target.value)}
                      placeholder={t.profile.lastNamePlaceholder}
                      mode={mode} colors={colors}
                      style={{ padding: '0.375rem 0.75rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {nameChanged && (
                        <>
                          <Button variant="secondary" onClick={handleDiscardName} disabled={nameLoading} mode={mode} colors={colors} style={{ padding: '0.375rem 0.875rem' }}>
                            {t.profile.discard}
                          </Button>
                          <Button variant="primary" onClick={handleSaveName} disabled={nameLoading} mode={mode} colors={colors} style={{ padding: '0.375rem 0.875rem' }}>
                            {nameLoading ? t.profile.saving : t.profile.saveChanges}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', width: '100%' }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(nameType === 'username' || nameType === 'full') && (
                    <Input
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder={t.profile.usernamePlaceholder}
                      mode={mode} colors={colors}
                      style={{ padding: '0.375rem 0.75rem', width: '100%' }}
                    />
                  )}
                  {(nameType === 'given_family' || nameType === 'full') && (
                    <>
                      <Input
                        value={givenName}
                        onChange={e => setGivenName(e.target.value)}
                        placeholder={t.profile.firstNamePlaceholder}
                        mode={mode} colors={colors}
                        style={{ padding: '0.375rem 0.75rem', width: '100%' }}
                      />
                      <Input
                        value={familyName}
                        onChange={e => setFamilyName(e.target.value)}
                        placeholder={t.profile.lastNamePlaceholder}
                        mode={mode} colors={colors}
                        style={{ padding: '0.375rem 0.75rem', width: '100%' }}
                      />
                    </>
                  )}
                </div>
                {nameChanged && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
                    <button
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
                    <button
                      onClick={handleSaveName}
                      disabled={nameLoading}
                      aria-label={t.profile.saveChanges}
                      style={{
                        width: '2rem', height: '2rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: c.accentBlue, border: `1px solid ${c.accentBlue}`,
                        borderRadius: '0.25rem', cursor: nameLoading ? 'not-allowed' : 'pointer',
                        color: '#fff', padding: 0,
                      }}
                    >{nameLoading ? <SpinnerIcon size={12} color="#fff" /> : <Check size={14} />}</button>
                  </div>
                )}
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
          onVerifyPassword={onVerifyPassword}
          onSendVerification={onSendEmailVerification}
          onVerifyCodeAndUpdate={async (value, verificationId, identityVerificationId, code, verificationTimestamp): Promise<ActionResult> => {
            const vr = await onVerifyCode('email', value, verificationId, code);
            if (!vr.ok) return vr;
            const ur = await onUpdateEmail(value, vr.data.verificationRecordId, identityVerificationId, verificationTimestamp);
            if (!ur.ok) return ur;
            refreshData();
            return { ok: true };
          }}
          onRemove={async (id, timestamp): Promise<ActionResult> => { const r = await onRemoveEmail(id, timestamp); if (!r.ok) return r; refreshData(); return { ok: true }; }}
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
          onVerifyPassword={onVerifyPassword}
          onSendVerification={onSendPhoneVerification}
          onVerifyCodeAndUpdate={async (value, verificationId, identityVerificationId, code, verificationTimestamp): Promise<ActionResult> => {
            const vr = await onVerifyCode('phone', value, verificationId, code);
            if (!vr.ok) return vr;
            const ur = await onUpdatePhone(value, vr.data.verificationRecordId, identityVerificationId, verificationTimestamp);
            if (!ur.ok) return ur;
            refreshData();
            return { ok: true };
          }}
          onRemove={async (id, timestamp): Promise<ActionResult> => { const r = await onRemovePhone(id, timestamp); if (!r.ok) return r; refreshData(); return { ok: true }; }}
          onSuccess={onSuccess} onError={onError} mobmode={mobmode} t={t} mode={mode} colors={colors}
        />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', flex: 1, minHeight: 0, marginBottom: '40px' }}>
        <Card mode={mode} colors={colors} style={{ marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <p style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: '0.6875rem', color: c.textTertiary, margin: 0 }}>
                {t.profile.rolesDescription}
              </p>
              <RefreshButton
                onClick={() => setRolesRefreshKey(k => k + 1)}
                loading={rolesLoading}
                colors={colors}
                ariaLabel={t.profile.refreshRoles}
              />
            </div>
            {rolesLoading ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: '0.6875rem', color: c.textTertiary }}>
                <SpinnerIcon size={0.875} color={c.textTertiary} /> {t.profile.loading}
              </div>
            ) : rolesError ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: '0.6875rem', color: c.accentRed }}>
                {t.profile.rolesError}
              </div>
            ) : userRoles.length === 0 ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: '0.6875rem', color: c.textTertiary }}>
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
        </Card>

        <PersonalPermissionsBlock mode={mode} colors={colors} t={t} cardStyle={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginBottom: 0 }} />
      </div>

    </div>
  );
}
