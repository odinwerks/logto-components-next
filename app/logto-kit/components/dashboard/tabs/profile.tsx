'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { UserData } from '../../../logic/types';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';
import { Pencil, X, Mail, Phone } from 'lucide-react';
import { UserBadge } from '../../userbutton';
import { readEnv } from '../../../logic/env';
import { useAvatarUpload } from '../../handlers/use-avatar-upload';
import { updateAvatarUrl } from '../../../logic/actions';
import { Button } from '../../shared/Button';
import { Input } from '../../shared/Input';
import { ContactRow, Card, HR, SL } from '../shared/ContactRow';
import { Overlay } from '../shared/FlowModal';
import { ImageCropper, type ImageCropperRef } from '../shared/ImageCropper';

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

interface ProfileTabProps {
  userData:          UserData;
  theme:             ThemeSpec;
  t:                 Translations;
  onUpdateBasicInfo: (updates: { name?: string }) => Promise<void>;
  onUpdateAvatarUrl: (avatarUrl: string) => Promise<void>;
  onUpdateProfile:   (profile: { givenName?: string; familyName?: string }) => Promise<void>;
  onVerifyPassword: (password: string) => Promise<{ verificationRecordId: string }>;
  onSendEmailVerification: (email: string) => Promise<{ verificationId: string }>;
  onSendPhoneVerification: (phone: string) => Promise<{ verificationId: string }>;
  onVerifyCode: (type: 'email' | 'phone', value: string, verificationId: string, code: string) => Promise<{ verificationRecordId: string }>;
  onUpdateEmail: (email: string | null, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string) => Promise<void>;
  onUpdatePhone: (phone: string, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string) => Promise<void>;
  onRemoveEmail: (identityVerificationRecordId: string) => Promise<void>;
  onRemovePhone: (identityVerificationRecordId: string) => Promise<void>;
  onSuccess:         (message: string) => void;
  onError:           (message: string) => void;
  refreshData:       () => void;
}

export function ProfileTab({
  userData, theme, t,
  onUpdateBasicInfo, onUpdateAvatarUrl, onUpdateProfile,
  onVerifyPassword, onSendEmailVerification, onSendPhoneVerification,
  onVerifyCode, onUpdateEmail, onUpdatePhone, onRemoveEmail, onRemovePhone,
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);
  const cropperRef = useRef<ImageCropperRef>(null);
  const cropPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => { cropPreviewUrlRef.current = cropPreviewUrl; }, [cropPreviewUrl]);

  const { upload, isUploading, clearError } = useAvatarUpload({
    userId: userData.id,
    onSuccess: async (url: string) => {
      await updateAvatarUrl(url);
      onSuccess(t.profile.avatarUpdated || 'Avatar updated.');
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
      onError(t.profile.avatarInvalidType || 'Only JPEG, PNG, WebP, or GIF images are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      onError(t.profile.avatarTooLarge || 'File must be under 2 MB.');
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
      await onUpdateAvatarUrl('');
      onSuccess(t.profile.avatarRemoved || 'Avatar removed.');
      refreshData();
      setAvatarModalOpen(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to remove avatar.');
    } finally {
      setAvatarLoading(false);
    }
  }, [onUpdateAvatarUrl, onSuccess, onError, refreshData, t]);

  const handleApplyCrop = useCallback(async () => {
    if (!cropperRef.current || !selectedFile) return;
    try {
      const blob = await cropperRef.current.cropToBlob();
      if (!blob) {
        onError('Failed to crop image.');
        return;
      }
      const croppedFile = new File(
        [blob],
        selectedFile.name.replace(/\.[^.]+$/, '.png'),
        { type: 'image/png' },
      );
      await upload(croppedFile);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to process image.');
    }
  }, [selectedFile, upload, onError]);

  const handleCancelCrop = useCallback(() => {
    if (cropPreviewUrl) {
      URL.revokeObjectURL(cropPreviewUrl);
    }
    setCropPreviewUrl(null);
    setSelectedFile(null);
  }, [cropPreviewUrl]);

  const handleCloseModal = useCallback(() => {
    if (cropPreviewUrl) {
      URL.revokeObjectURL(cropPreviewUrl);
    }
    setCropPreviewUrl(null);
    setSelectedFile(null);
    setAvatarModalOpen(false);
  }, [cropPreviewUrl]);

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
            boxShadow: theme.tokens.shadows.modal,
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
                  ? (t.profile.adjustPhoto || 'Adjust your photo')
                  : (t.profile.profilePhoto || 'Profile photo')}
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
                  style={{
                    ...dropZoneStyle,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    minHeight: '200px',
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
                        color: '#ef4444',
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
                  theme={theme}
                />

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
                  <Button variant="secondary" onClick={handleCancelCrop} theme={theme}>
                    {t.profile.cancel}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleApplyCrop}
                    disabled={isUploading}
                    theme={theme}
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
        <div style={{ position: 'relative', width: '96px', height: '96px', flexShrink: 0 }}>
            <UserBadge
              Canvas={savedAvatarUrl ? 'Avatar' : 'Initials'}
              Size="96px"
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

          <div style={{ ...cs.surfaces.well, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'flex-start' }}>
            <label style={{ ...cs.inputs.label, marginBottom: '0.25rem' }}>{t.profile.firstName}</label>
            <label style={{ ...cs.inputs.label, marginBottom: '0.25rem' }}>{t.profile.lastName}</label>
            <div />
            <Input
              value={givenName}
              onChange={e => setGivenName(e.target.value)}
              placeholder={t.profile.firstNamePlaceholder}
              theme={theme}
              style={{ padding: '0.375rem 0.75rem' }}
            />
            <Input
              value={familyName}
              onChange={e => setFamilyName(e.target.value)}
              placeholder={t.profile.lastNamePlaceholder}
              theme={theme}
              style={{ padding: '0.375rem 0.75rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {nameChanged && (
                <Button variant="secondary" onClick={handleDiscardName} disabled={nameLoading} theme={theme} style={{ padding: '0.375rem 0.875rem' }}>
                  {t.profile.discard}
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handleSaveName}
                disabled={!nameChanged || nameLoading}
                theme={theme}
                style={{ padding: '0.375rem 0.875rem' }}
              >
                {nameLoading
                  ? <><SpinnerIcon size={0.8125} color={c.contrastText} /> {t.profile.saving}</>
                  : <><CheckIcon   size={0.8125} color={c.contrastText} /> {t.profile.saveChanges}</>
                }
              </Button>
            </div>
          </div>
        </div>
      </div>

      <SL theme={theme}>{t.security.contactAndCredentials}</SL>
      <Card theme={theme}>
        <ContactRow
          label={t.security.email}
          Icon={Mail}
          currentValue={userData.primaryEmail}
          type="email"
          placeholder={t.profile.emailPlaceholder}
          onVerifyPassword={onVerifyPassword}
          onSendVerification={onSendEmailVerification}
          onVerifyCodeAndUpdate={async (value, verificationId, identityVerificationId, code) => {
            const result = await onVerifyCode('email', value, verificationId, code);
            await onUpdateEmail(value, result.verificationRecordId, identityVerificationId);
          }}
          onRemove={onRemoveEmail}
          onSuccess={onSuccess} onError={onError} t={t} theme={theme}
        />
        <HR theme={theme} />
        <ContactRow
          label={t.security.phone}
          Icon={Phone}
          currentValue={userData.primaryPhone}
          type="phone"
          placeholder={t.profile.phonePlaceholder}
          onVerifyPassword={onVerifyPassword}
          onSendVerification={onSendPhoneVerification}
          onVerifyCodeAndUpdate={async (value, verificationId, identityVerificationId, code) => {
            const result = await onVerifyCode('phone', value, verificationId, code);
            await onUpdatePhone(value, result.verificationRecordId, identityVerificationId);
          }}
          onRemove={onRemovePhone}
          onSuccess={onSuccess} onError={onError} t={t} theme={theme}
        />
      </Card>
    </div>
  );
}