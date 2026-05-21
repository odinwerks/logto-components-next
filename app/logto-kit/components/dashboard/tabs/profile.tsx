'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { UserData, UserRole, PersonalPermission } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { Pencil, X, Mail, Phone, Shield } from 'lucide-react';
import { UserBadge } from '../../userbutton';
import { readEnv } from '../../../logic/env';
import { useAvatarUpload } from '../../handlers/use-avatar-upload';
import type { ActionResult, DataResult } from '../../../logic/actions/safe';
import { Button } from '../../shared/Button';
import { Input } from '../../shared/Input';
import { ContactRow, Card, HR } from '../shared/ContactRow';
import { RoleCard } from '../shared/RoleCard';
import { RefreshButton } from '../shared/RefreshButton';
import { Overlay } from '../shared/FlowModal';
import { ImageCropper, type ImageCropperRef } from '../shared/ImageCropper';
import { useRefreshable } from '../../../hooks/use-refreshable';
import { loadPersonalRoles } from '../../../actions/load-personal-roles';
import { loadPersonalPermissions } from '../../../actions/load-personal-permissions';

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

const FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace";

// ─── PersonalPermissionsBlock — refreshable wrapper for personal (global RBAC)
//     permissions. Uses the same pattern as OrganizationsTab's PermissionsBlock. ───
interface PersonalPermissionsBlockProps {
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
}

const PersonalPermissionsBlock = ({ mode, colors, t }: PersonalPermissionsBlockProps) => {
  const c = colors;
  const { visible, triggerRefresh } = useRefreshable();
  const [permissions, setPermissions] = useState<PersonalPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPermissions([]);
    setLoading(true);
    setError(false);

    loadPersonalPermissions()
      .then(r => {
        if (cancelled) return;
        if (r.ok) setPermissions(r.data);
        else { console.error('[PersonalPermissionsBlock] Failed:', r.error); setError(true); }
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[PersonalPermissionsBlock] Error:', err);
        setError(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <>
      <Card mode={mode} colors={colors}>
        <div style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <p style={{ fontFamily: FONT_MONO, fontSize: '0.6875rem', color: c.textTertiary, margin: 0 }}>
              {t.profile.personalPermissionsDesc}
            </p>
            <RefreshButton onClick={triggerRefresh} loading={loading} colors={colors} t={t} />
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', fontFamily: FONT_MONO, fontSize: '0.6875rem', color: c.textTertiary }}>
              <SpinnerIcon size={0.875} color={c.textTertiary} /> {t.profile.loadingPermissions}
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', fontFamily: FONT_MONO, fontSize: '0.6875rem', color: c.accentRed }}>
              <Shield size={24} strokeWidth={1.5} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
              <p>{t.profile.permissionsError}</p>
            </div>
          ) : permissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', fontFamily: FONT_MONO, fontSize: '0.6875rem', color: c.textTertiary }}>
              <Shield size={24} strokeWidth={1} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
              <p>{t.profile.noPersonalPermissions}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {permissions.map((perm, index) => (
                <div
                  key={`${perm.resourceIndicator}:${perm.scope}-${index}`}
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
                  <span style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textTertiary, textAlign: 'right' }}>
                    {t.profile.resourceLabel}: {perm.resourceName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </>
  );
};

interface ProfileTabProps {
  userData:          UserData;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t:                 Translations;
  onUpdateBasicInfo: (updates: { name?: string; username?: string }) => Promise<ActionResult>;
  onUpdateAvatarUrl: (avatarUrl: string) => Promise<ActionResult>;
  onUpdateProfile:   (profile: { givenName?: string; familyName?: string }) => Promise<ActionResult>;
  onVerifyPassword: (password: string) => Promise<DataResult<{ verificationRecordId: string }>>;
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
  userData, mode, colors, t,
  onUpdateBasicInfo, onUpdateAvatarUrl, onUpdateProfile,
  onVerifyPassword, onSendEmailVerification, onSendPhoneVerification,
  onVerifyCode, onUpdateEmail, onUpdatePhone, onRemoveEmail, onRemovePhone,
  onSuccess, onError, refreshData,
}: ProfileTabProps) {
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

  const _rawNameType = readEnv('NAME_TYPE') ?? 'given_family';
  const nameType: 'given_family' | 'username' | 'full' =
    (_rawNameType === 'given_family' || _rawNameType === 'username' || _rawNameType === 'full')
      ? _rawNameType
      : 'given_family';

  const [givenName,   setGivenName]   = useState(userData.profile?.givenName  ?? '');
  const [familyName,  setFamilyName]  = useState(userData.profile?.familyName ?? '');
  const [username,    setUsername]    = useState(userData.username ?? '');
  const [nameLoading, setNameLoading] = useState(false);

  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userData.id) return;
    setUserRoles([]);
    setRolesLoading(true);
    setRolesError(false);
    loadPersonalRoles()
      .then(r => {
        if (cancelled) return;
        if (r.ok) setUserRoles(r.data);
        else {
          console.error('[ProfileTab] Failed to load roles:', r.error);
          setRolesError(true);
        }
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[ProfileTab] Error loading roles:', err);
        setRolesError(true);
      })
      .finally(() => {
        if (!cancelled) setRolesLoading(false);
      });
    return () => { cancelled = true; };
  }, [userData.id]);

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
        if (!profileResult.ok) { onError(profileResult.error); refreshData(); return; }
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
          if (!profileResult.ok) { onError(profileResult.error); refreshData(); return; }
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
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);
  const cropperRef = useRef<ImageCropperRef>(null);
  const cropPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => { cropPreviewUrlRef.current = cropPreviewUrl; }, [cropPreviewUrl]);

  useEffect(() => {
    setUsername(userData.username ?? '');
  }, [userData.username]);

  useEffect(() => {
    setGivenName(userData.profile?.givenName ?? '');
  }, [userData.profile?.givenName]);

  useEffect(() => {
    setFamilyName(userData.profile?.familyName ?? '');
  }, [userData.profile?.familyName]);

  const { upload, isUploading, clearError } = useAvatarUpload({
    userId: userData.id,
    onSuccess: async (url: string) => {
      // Logto backend already persisted the avatar via POST /api/my-account/avatar
      if (readEnv('PFP_BACKEND')?.toLowerCase() !== 'logto') {
        const result = await onUpdateAvatarUrl(url);
        if (!result.ok) { onError(result.error); return; }
      }
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
  }, [selectedFile, upload, onError]);

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

  // ESC key handler - disabled during upload
  useEffect(() => {
    if (!avatarModalOpen || isUploading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
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
    <div>
      {avatarModalOpen && (
        <Overlay onDismiss={handleCloseModal}>
          <div style={{
            width: '100%',
            maxWidth: inCropMode ? '42rem' : '32rem',
            background: c.bgSecondary,
            border: `1px solid ${c.borderColor}`,
            boxShadow: mode === 'dark' ? '0 2rem 5.625rem rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)' : '0 2rem 5.625rem rgba(0,0,0,0.2)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transition: 'max-width 0.25s ease',
          }}>
            {/* Header — X only */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: `1px solid ${c.borderColor}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <p style={{
                fontFamily: ty.fontSans,
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: c.textPrimary,
                margin: 0,
                letterSpacing: '-0.02em',
              }}>
                {inCropMode
                  ? t.profile.adjustPhoto
                  : t.profile.profilePhoto}
              </p>
              <button
                onClick={handleCloseModal}
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

            {!inCropMode ? (
              /* ── Upload mode: full-width drop zone ── */
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
                  onClick={(e) => {
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

                {savedAvatarUrl && (
                  <p style={{
                    margin: '0.875rem 0 0',
                    textAlign: 'center',
                    fontSize: ty.size.sm,
                    color: c.textTertiary,
                    fontFamily: ty.fontSans,
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
                  </p>
                )}
              </div>
            ) : (
              /* ── Crop mode: large cropper + controls ── */
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                <ImageCropper
                  ref={cropperRef}
                  imageUrl={cropPreviewUrl!}
                  displaySize={380}
                  mode={mode} colors={colors}
                />

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
                  <Button variant="secondary" onClick={handleCancelCrop} mode={mode} colors={colors}>
                    {t.profile.cancel}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleApplyCrop}
                    disabled={isUploading}
                    mode={mode} colors={colors}
                  >
                    {isUploading ? (
                      <><SpinnerIcon size={0.8125} color={c.contrastText} /> Uploading…</>
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
            {/* Username row — shown in username and full modes */}
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
                  {/* Buttons only inside username div in username-only mode */}
                  {nameType === 'username' && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      {nameChanged && (
                        <Button variant="secondary" onClick={handleDiscardName} disabled={nameLoading} mode={mode} colors={colors} style={{ padding: '0.375rem 0.875rem' }}>
                          {t.profile.discard}
                        </Button>
                      )}
                      <Button variant="primary" onClick={handleSaveName} disabled={!nameChanged || nameLoading} mode={mode} colors={colors} style={{ padding: '0.375rem 0.875rem' }}>
                        {nameLoading
                          ? <><SpinnerIcon size={0.8125} color={c.contrastText} /> {t.profile.saving}</>
                          : <><CheckIcon size={0.8125} color={c.contrastText} /> {t.profile.saveChanges}</>
                        }
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Given/Family grid — shown in given_family and full modes */}
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
                {/* Buttons in grid for given_family and full modes */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {nameChanged && (
                      <Button variant="secondary" onClick={handleDiscardName} disabled={nameLoading} mode={mode} colors={colors} style={{ padding: '0.375rem 0.875rem' }}>
                        {t.profile.discard}
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      onClick={handleSaveName}
                      disabled={!nameChanged || nameLoading}
                      mode={mode} colors={colors}
                      style={{ padding: '0.375rem 0.875rem' }}
                    >
                      {nameLoading
                        ? <><SpinnerIcon size={0.8125} color={c.contrastText} /> {t.profile.saving}</>
                        : <><CheckIcon   size={0.8125} color={c.contrastText} /> {t.profile.saveChanges}</>
                      }
                    </Button>
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
          onSuccess={onSuccess} onError={onError} t={t} mode={mode} colors={colors}
        />
        <HR colors={colors} />
        <ContactRow
          label={t.security.phone}
          Icon={Phone}
          currentValue={userData.primaryPhone}
          type="phone"
          placeholder={t.profile.phonePlaceholder}
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
          onSuccess={onSuccess} onError={onError} t={t} mode={mode} colors={colors}
        />
      </Card>

      <Card mode={mode} colors={colors}>
        <div style={{ padding: '1rem 1.25rem' }}>
          <p style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: '0.6875rem', color: c.textTertiary, marginBottom: '0.75rem' }}>
            {t.profile.rolesDescription}
          </p>
          {rolesLoading ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: '0.6875rem', color: c.textTertiary }}>
              <SpinnerIcon size={0.875} color={c.textTertiary} /> {t.profile.loading}
            </div>
          ) : rolesError ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: '0.6875rem', color: c.accentRed }}>
              <Shield size={24} strokeWidth={1.5} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
              <p>{t.profile.rolesError}</p>
            </div>
          ) : userRoles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: '0.6875rem', color: c.textTertiary }}>
              <Shield size={24} strokeWidth={1} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
              <p>{t.profile.noRoles}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {userRoles.map((role) => (
                <RoleCard
                  key={role.id}
                  name={role.name}
                  subtitle={role.description}
                  subtitleLabel={t.profile.roleDescriptionLabel}
                  id={role.id}
                  idLabel={t.profile.roleIdLabel}
                  colors={colors}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      <PersonalPermissionsBlock mode={mode} colors={colors} t={t} />

    </div>
  );
}