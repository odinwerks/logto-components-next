'use client';

import { useState, useCallback, useRef } from 'react';
import type { UserData } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { UserBadge } from '../../userbutton';

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

const UploadIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const TrashIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
);
const CheckIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const LinkIcon = ({ size = 12, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const SpinnerIcon = ({ size = 14, color = 'currentColor' }) => (
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

  const savedAvatarUrl = userData.avatar ?? '';
  const badgeDisplayUrl = localPreview ?? savedAvatarUrl;
  const urlChanged = avatarUrl.trim() !== savedAvatarUrl;

  const handleFileSelected = useCallback(async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) { onError(t.profile.avatarInvalidType || 'Only JPEG, PNG, WebP, or GIF images are allowed.'); return; }
    if (file.size > 2 * 1024 * 1024) { onError(t.profile.avatarTooLarge || 'File must be under 2 MB.'); return; }

    setLocalPreview(URL.createObjectURL(file));

    setAvatarLoading(true);
    try {
      const remoteUrl = await uploadAvatarToStorage(file);
      setAvatarUrl(remoteUrl);
      setLocalPreview(null);
      await onUpdateAvatarUrl(remoteUrl);
      onSuccess(t.profile.avatarUpdated || 'Avatar updated.');
      refreshData();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setAvatarLoading(false);
    }
  }, [onUpdateAvatarUrl, onSuccess, onError, refreshData, t]);

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
    <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: tc.textTertiary, marginBottom: 12, fontFamily: 'var(--font-ibm-plex-mono)' }}>{text}</p>
  );
  const fieldLabel = (text: string) => (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: tc.textTertiary, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 7, fontFamily: 'var(--font-ibm-plex-mono)' }}>{text}</label>
  );
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', background: tc.bgPrimary, border: `1px solid ${tc.borderColor}`,
    color: tc.textPrimary, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };
  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12,
    fontFamily: 'inherit', fontWeight: 500, border: `1px solid ${tc.borderColor}`,
    background: tc.bgTertiary, color: tc.textSecondary, cursor: 'pointer', flexShrink: 0,
  };
  const btnPrimary: React.CSSProperties = { ...btnBase, background: accentBlue, color: '#fff', border: 'none' };
  const btnDanger: React.CSSProperties = { ...btnBase, background: 'transparent', color: accentRed, border: `1px solid ${accentRed}`, padding: '8px 10px' };
  const card: React.CSSProperties = { background: tc.bgSecondary, border: `1px solid ${tc.borderColor}`, padding: '20px 22px', marginBottom: 20 };

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {sectionLabel(t.profile.profilePhoto || 'Profile photo')}
      <div style={card}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <UserBadge
              Canvas={badgeDisplayUrl ? 'Avatar' : 'Initials'}
              Size="72px" shape="sq"
              userData={{ ...userData, avatar: badgeDisplayUrl || undefined }}
              themeColors={tc}
            />
            {localPreview && !avatarLoading && (
              <div style={{ position: 'absolute', bottom: -6, left: 0, right: 0, textAlign: 'center', fontSize: 9, fontFamily: 'var(--font-ibm-plex-mono)', color: accentBlue, letterSpacing: '0.04em' }}>
                PREVIEW
              </div>
            )}
            {avatarLoading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)' }}>
                <SpinnerIcon size={20} color="#fff"/>
              </div>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelected(f); }}
              onClick={() => !avatarLoading && fileInputRef.current?.click()}
              style={{
                border: `1px dashed ${isDragging ? accentBlue : tc.borderColor}`,
                padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12,
                background: isDragging ? tc.bgTertiary : 'transparent',
                transition: 'border-color 0.15s, background 0.15s', cursor: 'pointer',
              }}
            >
              <UploadIcon size={16} color={tc.textTertiary}/>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: tc.textSecondary }}>
                  {t.profile.dragDrop || 'Drag & drop or'} <span style={{ color: accentBlue, textDecoration: 'underline' }}>{t.profile.browse || 'browse'}</span>
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: tc.textTertiary, fontFamily: 'var(--font-ibm-plex-mono)' }}>
                  PNG · JPEG · WebP · GIF · max 2 MB
                </p>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={handleFileInputChange}/>

            <div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.35 }}>
                    <LinkIcon size={12} color={tc.textSecondary}/>
                  </div>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                    placeholder="https://your-bucket.com/avatar.png"
                    style={{ ...inputStyle, paddingLeft: 28, fontSize: 12 }}
                  />
                </div>
                <button
                  style={{ ...btnPrimary, opacity: (!urlChanged || avatarLoading) ? 0.4 : 1, cursor: (!urlChanged || avatarLoading) ? 'not-allowed' : 'pointer' }}
                  onClick={handleSaveAvatarUrl}
                  disabled={!urlChanged || avatarLoading}
                >
                  {avatarLoading ? <SpinnerIcon size={12} color="#fff"/> : <CheckIcon size={12} color="#fff"/>}
                  {' '}{t.profile.saveUrl || 'Save URL'}
                </button>
                {savedAvatarUrl && (
                  <button style={{ ...btnDanger, opacity: avatarLoading ? 0.4 : 1 }} disabled={avatarLoading} onClick={handleRemoveAvatar} title={t.profile.removeAvatar || 'Remove avatar'}>
                    <TrashIcon size={12} color={accentRed}/>
                  </button>
                )}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: tc.textTertiary, fontFamily: 'var(--font-ibm-plex-mono)', lineHeight: 1.55 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 18 }}>
          <div>
            {fieldLabel(t.profile.firstName || 'First name')}
            <input type="text" value={givenName} onChange={e => setGivenName(e.target.value)} placeholder={t.profile.firstNamePlaceholder || 'First name'} style={inputStyle}/>
          </div>
          <div>
            {fieldLabel(t.profile.lastName || 'Last name')}
            <input type="text" value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder={t.profile.lastNamePlaceholder || 'Last name'} style={inputStyle}/>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {nameChanged && (
            <button style={btnBase} onClick={handleDiscardName} disabled={nameLoading}>{t.profile.discard || 'Discard'}</button>
          )}
          <button
            style={{ ...btnPrimary, opacity: (!nameChanged || nameLoading) ? 0.4 : 1, cursor: (!nameChanged || nameLoading) ? 'not-allowed' : 'pointer' }}
            onClick={handleSaveName}
            disabled={!nameChanged || nameLoading}
          >
            {nameLoading ? <><SpinnerIcon size={13} color="#fff"/> {t.profile.saving || 'Saving…'}</> : <><CheckIcon size={13} color="#fff"/> {t.profile.saveChanges || 'Save changes'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
