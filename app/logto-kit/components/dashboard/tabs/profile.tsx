'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { UserData } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { UserBadge } from '../../userbutton';
import { useAvatarUpload } from '../../handlers/use-avatar-upload';
import { updateAvatarUrl } from '../../../logic/actions';

interface ProfileTabProps {
  userData: UserData;
  themeColors: ThemeColors;
  t: Translations;
  onUpdateBasicInfo: (updates: { name?: string }) => Promise<void>;
  onUpdateAvatarUrl: (avatarUrl: string) => Promise<void>;
  onUpdateProfile: (profile: { givenName?: string; familyName?: string }) => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  refreshData: () => void;
}

async function uploadAvatarToStorage(_file: File): Promise<string> {
  throw new Error('Storage not configured yet. Paste a hosted URL below to save your avatar.');
}

const UploadIcon = ({ size = 0.875, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const TrashIcon = ({ size = 0.875, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
);
const CheckIcon = ({ size = 0.875, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const LinkIcon = ({ size = 0.75, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const SpinnerIcon = ({ size = 0.875, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite"/>
    </path>
  </svg>
);

export function ProfileTab({
  userData,
  themeColors: tc,
  t,
  onUpdateBasicInfo,
  onUpdateAvatarUrl,
  onUpdateProfile,
  onSuccess,
  onError,
  refreshData,
}: ProfileTabProps) {
  const [givenName, setGivenName] = useState(userData.profile?.givenName ?? '');
  const [familyName, setFamilyName] = useState(userData.profile?.familyName ?? '');
  const [nameLoading, setNameLoading] = useState(false);

  const nameChanged =
    givenName !== (userData.profile?.givenName ?? '') ||
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
    setGivenName(userData.profile?.givenName ?? '');
    setFamilyName(userData.profile?.familyName ?? '');
  }, [userData]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(userData.avatar ?? '');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { upload, isUploading, error: uploadError, clearError } = useAvatarUpload({
    userId: userData.id,
    onSuccess: async (url: string) => {
      setAvatarUrl(url);
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

  const savedAvatarUrl = userData.avatar ?? '';
  const badgeDisplayUrl = localPreview ?? savedAvatarUrl;
  const urlChanged = avatarUrl.trim() !== savedAvatarUrl;

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const handleFileSelected = useCallback(async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) { onError(t.profile.avatarInvalidType || 'Only JPEG, PNG, WebP, or GIF images are allowed.'); return; }
    if (file.size > 2 * 1024 * 1024) { onError(t.profile.avatarTooLarge || 'File must be under 2 MB.'); return; }

    setLocalPreview(URL.createObjectURL(file));
    clearError();

    await upload(file);
  }, [upload, onError, t, clearError]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    e.target.value = '';
  }, [handleFileSelected]);

  const handleSaveAvatarUrl = useCallback(async () => {
    const trimmed = avatarUrl.trim();
    if (!trimmed) return;
    try { new URL(trimmed); } catch { onError(t.profile.invalidUrl || 'Please enter a valid URL.'); return; }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      onError(t.profile.urlMustBeHttp || 'URL must start with http:// or https://');
      return;
    }
    setAvatarLoading(true);
    try {
      await onUpdateAvatarUrl(trimmed);
      setLocalPreview(null);
      onSuccess(t.profile.avatarUpdated || 'Avatar updated.');
      refreshData();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update avatar.');
    } finally {
      setAvatarLoading(false);
    }
  }, [avatarUrl, onUpdateAvatarUrl, onSuccess, onError, refreshData, t]);

  const handleRemoveAvatar = useCallback(async () => {
    setAvatarLoading(true);
    try {
      await onUpdateAvatarUrl('');
      setAvatarUrl('');
      setLocalPreview(null);
      onSuccess(t.profile.avatarRemoved || 'Avatar removed.');
      refreshData();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to remove avatar.');
    } finally {
      setAvatarLoading(false);
    }
  }, [onUpdateAvatarUrl, onSuccess, onError, refreshData, t]);

  const displayName = [givenName, familyName].filter(Boolean).join(' ') || userData.name || userData.username || '—';

  const accentBlue = tc.accentBlue ?? '#3060e0';
  const accentRed = tc.accentRed ?? '#bf3a3a';

  const sectionLabel = (text: string) => (
    <p style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: tc.textTertiary, marginBottom: '0.75rem', fontFamily: 'var(--font-ibm-plex-mono)' }}>{text}</p>
  );
  const fieldLabel = (text: string) => (
    <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 500, color: tc.textTertiary, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '0.4375rem', fontFamily: 'var(--font-ibm-plex-mono)' }}>{text}</label>
  );
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5625rem 0.75rem', background: tc.bgPrimary, border: `1px solid ${tc.borderColor}`,
    color: tc.textPrimary, fontSize: '0.8125rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };
  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.4375rem 0.8125rem', fontSize: '0.6875rem',
    fontFamily: 'var(--font-ibm-plex-mono)', fontWeight: 500, border: `1px solid ${tc.borderColor}`,
    background: tc.bgTertiary, color: tc.textPrimary, cursor: 'pointer', flexShrink: 0, transition: 'opacity 0.15s ease',
  };
  const btnPrimary: React.CSSProperties = { ...btnBase };
  const btnDanger: React.CSSProperties = { ...btnBase, background: 'transparent', color: accentRed, border: `1px solid ${accentRed}`, padding: '0.4375rem 0.6875rem' };
  const card: React.CSSProperties = { background: tc.bgSecondary, border: `1px solid ${tc.borderColor}`, padding: '1.25rem 1.375rem', marginBottom: '1.25rem' };

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {sectionLabel(t.profile.profilePhoto || 'Profile photo')}
      <div style={card}>
        <div style={{ display: 'flex', gap: '1.125rem', alignItems: 'flex-start' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <UserBadge
              Canvas={badgeDisplayUrl ? 'Avatar' : 'Initials'}
              Size="72px" shape="sq"
              userData={{
                ...userData,
                profile: {
                  givenName: givenName,
                  familyName: familyName,
                },
                avatar: badgeDisplayUrl || undefined
              }}
            />
            {localPreview && !isUploading && (
              <div style={{ position: 'absolute', bottom: '-0.375rem', left: 0, right: 0, textAlign: 'center', fontSize: '0.5625rem', fontFamily: 'var(--font-ibm-plex-mono)', color: accentBlue, letterSpacing: '0.04em' }}>
                PREVIEW
              </div>
            )}
            {isUploading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)' }}>
                <SpinnerIcon size={1.25} color="#fff"/>
              </div>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelected(f); }}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              style={{
                border: `1px dashed ${isDragging ? accentBlue : tc.borderColor}`,
                padding: '0.8125rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: isDragging ? tc.bgTertiary : 'transparent',
                transition: 'border-color 0.15s, background 0.15s', cursor: 'pointer',
              }}
            >
              <UploadIcon size={1} color={tc.textTertiary}/>
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: tc.textSecondary }}>
                  {t.profile.dragDrop || 'Drag & drop or'} <span style={{ color: accentBlue, textDecoration: 'underline' }}>{t.profile.browse || 'browse'}</span>
                </p>
                <p style={{ margin: '0.1875rem 0 0', fontSize: '0.6875rem', color: tc.textTertiary, fontFamily: 'var(--font-ibm-plex-mono)' }}>
                  PNG · JPEG · WebP · GIF · max 2 MB
                </p>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={handleFileInputChange}/>

            <div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <div style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.35 }}>
                    <LinkIcon size={0.75} color={tc.textSecondary}/>
                  </div>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                    placeholder="https://your-bucket.com/avatar.png"
                    style={{ ...inputStyle, paddingLeft: '1.75rem', fontSize: '0.75rem' }}
                  />
                </div>
                <button
                  style={{ ...btnPrimary, opacity: (!urlChanged || isUploading) ? 0.4 : 1, cursor: (!urlChanged || isUploading) ? 'not-allowed' : 'pointer' }}
                  onClick={handleSaveAvatarUrl}
                  disabled={!urlChanged || isUploading}
                >
                  {isUploading ? <SpinnerIcon size={0.75} color="#fff"/> : <CheckIcon size={0.75} color="#fff"/>}
                  {' '}{t.profile.saveUrl || 'Save URL'}
                </button>
                {savedAvatarUrl && (
                  <button style={{ ...btnDanger, opacity: isUploading ? 0.4 : 1 }} disabled={isUploading} onClick={handleRemoveAvatar} title={t.profile.removeAvatar || 'Remove avatar'}>
                    <TrashIcon size={0.75} color={accentRed}/>
                  </button>
                )}
              </div>
              <p style={{ margin: '0.375rem 0 0', fontSize: '0.6875rem', color: tc.textTertiary, fontFamily: 'var(--font-ibm-plex-mono)', lineHeight: 1.55 }}>
                {localPreview
                  ? (t.profile.avatarPreviewHint || 'File selected for preview. Wire uploadAvatarToStorage() to auto-fill, or paste a hosted URL.')
                  : (t.profile.avatarUrlHint || 'Logto requires a public https:// URL. Wire uploadAvatarToStorage() to fill this automatically.')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {sectionLabel(t.profile.changeName || 'Change your name here')}
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem', marginBottom: '1.125rem' }}>
          <div>
            {fieldLabel(t.profile.firstName || 'First name')}
            <input type="text" value={givenName} onChange={e => setGivenName(e.target.value)} placeholder={t.profile.firstNamePlaceholder || 'First name'} style={inputStyle}/>
          </div>
          <div>
            {fieldLabel(t.profile.lastName || 'Last name')}
            <input type="text" value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder={t.profile.lastNamePlaceholder || 'Last name'} style={inputStyle}/>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          {nameChanged && (
            <button style={btnBase} onClick={handleDiscardName} disabled={nameLoading}>{t.profile.discard || 'Discard'}</button>
          )}
          <button
            style={{ ...btnPrimary, opacity: (!nameChanged || nameLoading) ? 0.4 : 1, cursor: (!nameChanged || nameLoading) ? 'not-allowed' : 'pointer' }}
            onClick={handleSaveName}
            disabled={!nameChanged || nameLoading}
          >
            {nameLoading ? <><SpinnerIcon size={0.8125} color="#fff"/> {t.profile.saving || 'Saving…'}</> : <><CheckIcon size={0.8125} color="#fff"/> {t.profile.saveChanges || 'Save changes'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
