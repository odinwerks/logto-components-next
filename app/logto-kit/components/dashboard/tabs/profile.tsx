'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { UserData } from '../../../logic/types';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';
import { Trash2 } from 'lucide-react';
import { UserBadge } from '../../userbutton';
import { useAvatarUpload } from '../../handlers/use-avatar-upload';
import { updateAvatarUrl } from '../../../logic/actions';
import { Button } from '../../shared/Button';
import { Input } from '../../shared/Input';

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Primitive sub-components (assembled from theme)
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ children, theme }: { children: React.ReactNode; theme: ThemeSpec }) {
  return <p style={theme.components.text.sectionLabel}>{children}</p>;
}

function Well({ children, theme }: { children: React.ReactNode; theme: ThemeSpec }) {
  return <div style={theme.components.surfaces.well}>{children}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfileTab
// ─────────────────────────────────────────────────────────────────────────────

interface ProfileTabProps {
  userData:          UserData;
  theme:             ThemeSpec;
  t:                 Translations;
  onUpdateBasicInfo: (updates: { name?: string }) => Promise<void>;
  onUpdateAvatarUrl: (avatarUrl: string) => Promise<void>;
  onUpdateProfile:   (profile: { givenName?: string; familyName?: string }) => Promise<void>;
  onSuccess:         (message: string) => void;
  onError:           (message: string) => void;
  refreshData:       () => void;
}

export function ProfileTab({
  userData, theme, t,
  onUpdateBasicInfo, onUpdateAvatarUrl, onUpdateProfile,
  onSuccess, onError, refreshData,
}: ProfileTabProps) {
  const cs = theme.components;
  const c  = theme.colors;
  const ty = theme.tokens.typography;

  const [givenName,   setGivenName]   = useState(userData.profile?.givenName  ?? '');
  const [familyName,  setFamilyName]  = useState(userData.profile?.familyName ?? '');
  const [nameLoading, setNameLoading] = useState(false);

  const nameChanged =
    givenName  !== (userData.profile?.givenName  ?? '') ||
    familyName !== (userData.profile?.familyName ?? '');

  const handleSaveName = useCallback(async () => {
    setNameLoading(true);
    try {
      const name = `${givenName} ${familyName}`.trim();
      if (name) await onUpdateBasicInfo({ name });
      await onUpdateProfile({ givenName, familyName });
      onSuccess(t.profile.profileUpdated);
      refreshData();
    } catch (err) {
      onError(err instanceof Error ? err.message : t.profile.updateFailed);
    } finally {
      setNameLoading(false);
    }
  }, [givenName, familyName, onUpdateBasicInfo, onUpdateProfile, onSuccess, onError, refreshData, t]);

  const handleDiscardName = useCallback(() => {
    setGivenName(userData.profile?.givenName  ?? '');
    setFamilyName(userData.profile?.familyName ?? '');
  }, [userData]);

  // ── Avatar handling ─────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [isDragging, setIsDragging]       = useState(false);

  const { upload, isUploading, clearError } = useAvatarUpload({
    userId: userData.id,
    onSuccess: async (url: string) => {
      setLocalPreview(null);
      await updateAvatarUrl(url);
      onSuccess(t.profile.avatarUpdated || 'Avatar updated.');
      refreshData();
    },
    onError: (message: string) => {
      setLocalPreview(null);
      onError(message);
    },
  });

  const savedAvatarUrl  = userData.avatar ?? '';
  const badgeDisplayUrl = localPreview ?? savedAvatarUrl;

  useEffect(() => {
    return () => { if (localPreview) URL.revokeObjectURL(localPreview); };
  }, [localPreview]);

  const handleFileSelected = useCallback(async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      onError(t.profile.avatarInvalidType || 'Only JPEG, PNG, WebP, or GIF images are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      onError(t.profile.avatarTooLarge || 'File must be under 2 MB.');
      return;
    }
    setLocalPreview(URL.createObjectURL(file));
    clearError();
    await upload(file);
  }, [upload, onError, t, clearError]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    e.target.value = '';
  }, [handleFileSelected]);

  const handleRemoveAvatar = useCallback(async () => {
    setAvatarLoading(true);
    try {
      await onUpdateAvatarUrl('');
      setLocalPreview(null);
      onSuccess(t.profile.avatarRemoved || 'Avatar removed.');
      refreshData();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to remove avatar.');
    } finally {
      setAvatarLoading(false);
    }
  }, [onUpdateAvatarUrl, onSuccess, onError, refreshData, t]);

  // ── Render ───────────────────────────────────────────────────────────────

  const dropZoneStyle: React.CSSProperties = {
    ...cs.surfaces.dropZone,
    ...(isDragging ? cs.surfaces.dropZoneActive : {}),
    opacity: isUploading ? 0.7 : 1,
  };

  return (
    <div>
      {/* Profile photo */}
      <SectionLabel theme={theme}>{t.profile.profilePhoto || 'Profile photo'}</SectionLabel>
      <Well theme={theme}>
        <div style={{ display: 'flex', gap: '1.125rem', alignItems: 'flex-start' }}>

          {/* Avatar preview */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <UserBadge
              Canvas={badgeDisplayUrl ? 'Avatar' : 'Initials'}
              Size="72px"
              shape="sq"
              userData={{
                ...userData,
                profile: { givenName, familyName },
                avatar: badgeDisplayUrl || undefined,
              }}
            />
            {localPreview && !isUploading && (
              <div style={{
                position:  'absolute', bottom: '-0.375rem',
                left:      0, right: 0, textAlign: 'center',
                fontSize:  ty.size.micro,
                fontFamily:ty.fontMono,
                color:     c.accentBlue,
                letterSpacing: '0.04em',
              }}>
                PREVIEW
              </div>
            )}
            {isUploading && (
              <div style={{
                position:        'absolute', inset: 0,
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                background:      'rgba(0,0,0,0.55)',
              }}>
                <SpinnerIcon size={1.25} color={c.bgPage === '#050805' ? '#fff' : c.bgPage} />
              </div>
            )}
          </div>

          {/* Drop zone */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              onDragOver={e  => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFileSelected(f);
              }}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              style={dropZoneStyle}
            >
              <UploadIcon size={1} color={c.textTertiary} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: ty.size.base, color: c.textSecondary, fontFamily: ty.fontSans }}>
                  {t.profile.dragDrop || 'Drag & drop or'}{' '}
                  <span style={{ color: c.accentBlue, textDecoration: 'underline' }}>
                    {t.profile.browse || 'browse'}
                  </span>
                </p>
                <p style={{ margin: '0.1875rem 0 0', ...cs.text.mutedMono }}>
                  PNG · JPEG · WebP · GIF · max 2 MB
                </p>
              </div>

              {savedAvatarUrl && (
                <button
                  style={{
                    position:        'absolute',
                    right:           '0.5rem',
                    top:             '50%',
                    transform:       'translateY(-50%)',
                    background:      'transparent',
                    border:          'none',
                    cursor:          isUploading ? 'not-allowed' : 'pointer',
                    padding:         '0.5rem',
                    opacity:         isUploading ? 0.4 : 1,
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'center',
                    width:           '3rem',
                    height:          '3rem',
                  }}
                  disabled={isUploading}
                  onClick={e => { e.stopPropagation(); handleRemoveAvatar(); }}
                  title={t.profile.removeAvatar || 'Remove avatar'}
                >
                  <Trash2 size={48} color={c.accentRed} />
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
          </div>
        </div>
      </Well>

      {/* Name section */}
      <SectionLabel theme={theme}>{t.profile.changeName || 'Change your name'}</SectionLabel>
      <Well theme={theme}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem', marginBottom: '1.125rem' }}>
          <div>
            <label style={cs.inputs.label}>{t.profile.firstName || 'First name'}</label>
            <Input
              value={givenName}
              onChange={e => setGivenName(e.target.value)}
              placeholder={t.profile.firstNamePlaceholder || 'First name'}
              theme={theme}
            />
          </div>
          <div>
            <label style={cs.inputs.label}>{t.profile.lastName || 'Last name'}</label>
            <Input
              value={familyName}
              onChange={e => setFamilyName(e.target.value)}
              placeholder={t.profile.lastNamePlaceholder || 'Last name'}
              theme={theme}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          {nameChanged && (
            <Button variant="secondary" onClick={handleDiscardName} disabled={nameLoading} theme={theme}>
              {t.profile.discard || 'Discard'}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleSaveName}
            disabled={!nameChanged || nameLoading}
            theme={theme}
          >
            {nameLoading
              ? <><SpinnerIcon size={0.8125} color={c.bgPage === '#050805' ? '#fff' : c.bgPage} /> {t.profile.saving || 'Saving…'}</>
              : <><CheckIcon   size={0.8125} color={c.bgPage === '#050805' ? '#fff' : c.bgPage} /> {t.profile.saveChanges || 'Save changes'}</>
            }
          </Button>
        </div>
      </Well>
    </div>
  );
}
