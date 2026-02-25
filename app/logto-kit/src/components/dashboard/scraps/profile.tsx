'use client';

import { useState, useCallback } from 'react';
import type { UserData } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { CodeBlock } from '../shared/CodeBlock';

interface ProfileTabProps {
  userData: UserData;
  themeColors: ThemeColors;
  t: Translations;
  onUpdateBasicInfo: (updates: { name?: string; username?: string }) => Promise<void>;
  onUpdateAvatarUrl: (avatarUrl: string) => Promise<void>;
  onUpdateProfile: (profile: { givenName?: string; familyName?: string }) => Promise<void>;
  onVerifyPassword: (password: string) => Promise<{ verificationRecordId: string }>;
  onSendEmailVerification: (email: string) => Promise<{ verificationId: string }>;
  onSendPhoneVerification: (phone: string) => Promise<{ verificationId: string }>;
  onVerifyCode: (type: 'email' | 'phone', value: string, verificationId: string, code: string) => Promise<{ verificationRecordId: string }>;
  onUpdateEmail: (email: string | null, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string) => Promise<void>;
  onUpdatePhone: (phone: string, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string) => Promise<void>;
  onRemoveEmail: (identityVerificationRecordId: string) => Promise<void>;
  onRemovePhone: (identityVerificationRecordId: string) => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  refreshData: () => void;
}

interface VerificationState {
  type: 'email' | 'phone' | null;
  operation: 'add' | 'edit' | 'remove' | null;
  step: 'password' | 'code' | null;
  verificationId: string | null;
  newValue: string;
}

export function ProfileTab({
  userData,
  themeColors,
  t,
  onUpdateBasicInfo,
  onUpdateAvatarUrl,
  onUpdateProfile,
  onVerifyPassword,
  onSendEmailVerification,
  onSendPhoneVerification,
  onVerifyCode,
  onUpdateEmail,
  onUpdatePhone,
  onRemoveEmail,
  onRemovePhone,
  onSuccess,
  onError,
  refreshData,
}: ProfileTabProps) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const [editGivenName, setEditGivenName] = useState(userData.profile?.givenName || '');
  const [editFamilyName, setEditFamilyName] = useState(userData.profile?.familyName || '');
  const [editUsername, setEditUsername] = useState(userData.username || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(userData.avatar || '');

  const [verificationState, setVerificationState] = useState<VerificationState>({
    type: null,
    operation: null,
    step: null,
    verificationId: null,
    newValue: '',
  });
  
  const [verificationCode, setVerificationCode] = useState('');
  const [passwordForVerification, setPasswordForVerification] = useState('');
  const [identityVerificationId, setIdentityVerificationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startVerification = useCallback((type: 'email' | 'phone', currentValue?: string) => {
    setVerificationState({
      type,
      operation: currentValue ? 'edit' : 'add',
      step: 'password',
      verificationId: null,
      newValue: currentValue || '',
    });
    setPasswordForVerification('');
    setVerificationCode('');
    setIdentityVerificationId(null);
  }, []);

  const handleRemoveEmail = useCallback(async () => {
    if (!userData.primaryEmail) return;
    if (!confirm(t.profile.confirmRemoveEmail)) return;

    setVerificationState({
      type: 'email',
      operation: 'remove',
      step: 'password',
      verificationId: null,
      newValue: '',
    });
    setPasswordForVerification('');
    setVerificationCode('');
    setIdentityVerificationId(null);
  }, [userData.primaryEmail, t]);

  const handleRemovePhone = useCallback(async () => {
    if (!userData.primaryPhone) return;
    if (!confirm(t.profile.confirmRemovePhone)) return;

    setVerificationState({
      type: 'phone',
      operation: 'remove',
      step: 'password',
      verificationId: null,
      newValue: '',
    });
    setPasswordForVerification('');
    setVerificationCode('');
    setIdentityVerificationId(null);
  }, [userData.primaryPhone, t]);

  const handleVerifyPassword = useCallback(async () => {
    if (!passwordForVerification) {
      onError(t.profile.passwordRequired);
      return;
    }

    setIsLoading(true);
    try {
      const identityResponse = await onVerifyPassword(passwordForVerification);
      const identityId = identityResponse.verificationRecordId;
      setIdentityVerificationId(identityId);

      if (verificationState.operation === 'remove') {
        if (verificationState.type === 'email') {
          await onRemoveEmail(identityId);
          onSuccess(t.profile.emailRemoved);
        } else {
          await onRemovePhone(identityId);
          onSuccess(t.profile.phoneRemoved);
        }
        cancelVerification();
        refreshData();
        return;
      }

      if (verificationState.type === 'email' && verificationState.newValue) {
        const response = await onSendEmailVerification(verificationState.newValue);
        setVerificationState((prev) => ({ ...prev, step: 'code', verificationId: response.verificationId }));
        onSuccess(`${t.verification.codeSent} ${verificationState.newValue}`);
      } else if (verificationState.type === 'phone' && verificationState.newValue) {
        const response = await onSendPhoneVerification(verificationState.newValue);
        setVerificationState((prev) => ({ ...prev, step: 'code', verificationId: response.verificationId }));
        onSuccess(`${t.verification.codeSent} ${verificationState.newValue}`);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : t.profile.verificationFailed);
    } finally {
      setIsLoading(false);
    }
  }, [
    passwordForVerification,
    verificationState,
    onVerifyPassword,
    onSendEmailVerification,
    onSendPhoneVerification,
    onRemoveEmail,
    onRemovePhone,
    onSuccess,
    onError,
    refreshData,
    t,
  ]);

  const handleVerifyCodeAndUpdate = useCallback(async () => {
    if (!verificationCode || !identityVerificationId || !verificationState.verificationId) {
      onError(t.profile.missingVerification);
      return;
    }

    setIsLoading(true);
    try {
      const verifyResult = await onVerifyCode(
        verificationState.type!,
        verificationState.newValue,
        verificationState.verificationId,
        verificationCode
      );
      const newIdentifierVerificationRecordId = verifyResult.verificationRecordId;

      if (verificationState.type === 'email') {
        await onUpdateEmail(verificationState.newValue, newIdentifierVerificationRecordId, identityVerificationId);
        onSuccess(t.profile.emailUpdated);
      } else if (verificationState.type === 'phone') {
        await onUpdatePhone(verificationState.newValue, newIdentifierVerificationRecordId, identityVerificationId);
        onSuccess(t.profile.phoneUpdated);
      }

      cancelVerification();
      refreshData();
    } catch (err) {
      onError(err instanceof Error ? err.message : t.profile.updateFailed);
    } finally {
      setIsLoading(false);
    }
  }, [
    verificationCode,
    identityVerificationId,
    verificationState,
    onVerifyCode,
    onUpdateEmail,
    onUpdatePhone,
    onSuccess,
    onError,
    refreshData,
    t,
  ]);

  const cancelVerification = useCallback(() => {
    setVerificationState({ type: null, operation: null, step: null, verificationId: null, newValue: '' });
    setVerificationCode('');
    setIdentityVerificationId(null);
    setPasswordForVerification('');
  }, []);

  const handleProfileUpdate = useCallback(async () => {
    setIsLoading(true);
    try {
      const name = `${editGivenName} ${editFamilyName}`.trim();
      const basicInfoUpdates: { name?: string; username?: string } = {};

      if (editUsername && editUsername !== userData?.username) {
        basicInfoUpdates.username = editUsername;
      }

      if (name && name !== userData?.name) {
        basicInfoUpdates.name = name;
      }

      if (Object.keys(basicInfoUpdates).length > 0) {
        await onUpdateBasicInfo(basicInfoUpdates);
      }

      // Update Avatar URL separately if changed
      if (editAvatarUrl !== userData?.avatar) {
        await onUpdateAvatarUrl(editAvatarUrl);
      }

      await onUpdateProfile({
        givenName: editGivenName,
        familyName: editFamilyName,
      });

      onSuccess(t.profile.profileUpdated);
      setIsEditingProfile(false);
      refreshData();
    } catch (err) {
      onError(err instanceof Error ? err.message : t.profile.updateFailed);
    } finally {
      setIsLoading(false);
    }
  }, [
    editGivenName,
    editFamilyName,
    editUsername,
    editAvatarUrl,
    userData,
    onUpdateBasicInfo,
    onUpdateAvatarUrl,
    onUpdateProfile,
    onSuccess,
    onError,
    refreshData,
    t,
  ]);

  const inputStyle = {
    width: '100%',
    padding: '8px',
    background: themeColors.bgPrimary,
    border: `1px solid ${themeColors.borderColor}`,
    borderRadius: '4px',
    color: themeColors.textPrimary,
    fontSize: '12px',
    fontFamily: 'var(--font-ibm-plex-mono)',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    color: themeColors.textSecondary,
    fontSize: '11px',
    marginBottom: '6px',
  };

  const buttonStyle = {
    padding: '8px 12px',
    background: themeColors.bgTertiary,
    color: themeColors.textPrimary,
    border: `1px solid ${themeColors.borderColor}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontFamily: 'var(--font-ibm-plex-mono)',
  };

  return (
    <div>
      {!isEditingProfile ? (
        <>
          <CodeBlock
            title={t.profile.userProfile}
            data={{
              id: userData.id,
              username: userData.username,
              name: userData.name,
              profile: {
                givenName: userData.profile?.givenName,
                familyName: userData.profile?.familyName,
              },
              primaryEmail: userData.primaryEmail,
              primaryPhone: userData.primaryPhone,
              avatar: userData.avatar,
              lastSignInAt: userData.lastSignInAt,
              createdAt: userData.createdAt,
              updatedAt: userData.updatedAt,
            }}
            themeColors={themeColors}
            t={t}
          />
          <button
            onClick={() => {
              setEditGivenName(userData.profile?.givenName || '');
              setEditFamilyName(userData.profile?.familyName || '');
              setEditUsername(userData.username || '');
              setEditAvatarUrl(userData.avatar || '');
              setIsEditingProfile(true);
            }}
            style={{ ...buttonStyle, marginTop: '12px' }}
          >
            {t.profile.editProfile}
          </button>
        </>
      ) : (
        <div
          style={{
            border: `1px solid ${themeColors.borderColor}`,
            borderRadius: '5px',
            padding: '16px',
            background: themeColors.bgSecondary,
          }}
        >
          <div style={{ color: themeColors.textTertiary, fontSize: '12px', marginBottom: '16px' }}>
            {t.profile.editingProfile}
          </div>

          {/* Given Name & Family Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>{t.profile.givenName}</label>
              <input
                type="text"
                value={editGivenName}
                onChange={(e) => setEditGivenName(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>{t.profile.familyName}</label>
              <input
                type="text"
                value={editFamilyName}
                onChange={(e) => setEditFamilyName(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Username */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{t.profile.username}</label>
            <input
              type="text"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              placeholder={t.profile.usernamePlaceholder}
              style={inputStyle}
            />
          </div>

          {/* Avatar URL */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{t.profile.avatarUrl || 'Avatar URL'}</label>
            <input
              type="text"
              value={editAvatarUrl}
              onChange={(e) => setEditAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              style={inputStyle}
            />
          </div>

          {/* Email Field */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{t.profile.email}</label>

            {verificationState.type === 'email' ? (
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                  <input
                    type="email"
                    value={verificationState.newValue}
                    onChange={(e) =>
                      setVerificationState((prev) => ({ ...prev, newValue: e.target.value }))
                    }
                    placeholder={t.profile.emailPlaceholder}
                    disabled={verificationState.step === 'code'}
                    style={{
                      ...inputStyle,
                      flex: '2',
                      background: verificationState.step === 'code' ? themeColors.bgTertiary : themeColors.bgPrimary,
                    }}
                  />

                  {verificationState.step === 'password' ? (
                    <input
                      type="password"
                      value={passwordForVerification}
                      onChange={(e) => setPasswordForVerification(e.target.value)}
                      placeholder={t.verification.password}
                      style={{ ...inputStyle, flex: '1' }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder={t.verification.verificationCode}
                      style={{ ...inputStyle, flex: '1' }}
                    />
                  )}

                  <button
                    onClick={verificationState.step === 'code' ? handleVerifyCodeAndUpdate : handleVerifyPassword}
                    disabled={isLoading}
                    style={{
                      ...buttonStyle,
                      background: themeColors.accentYellow,
                      color: '#000',
                      border: 'none',
                    }}
                  >
                    {isLoading
                      ? t.common.loading
                      : verificationState.step === 'code'
                      ? t.verification.verifyCode
                      : t.verification.verifyPassword}
                  </button>

                  <button
                    onClick={cancelVerification}
                    disabled={isLoading}
                    style={buttonStyle}
                  >
                    {t.profile.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: themeColors.bgPrimary,
                    border: `1px solid ${themeColors.borderColor}`,
                    borderRadius: '4px',
                    color: userData.primaryEmail ? themeColors.textPrimary : themeColors.textTertiary,
                    fontSize: '12px',
                    fontFamily: 'var(--font-ibm-plex-mono)',
                  }}
                >
                  {userData.primaryEmail || t.profile.null}
                </div>

                {userData.primaryEmail ? (
                  <>
                    <button
                      onClick={() => startVerification('email', userData.primaryEmail)}
                      style={buttonStyle}
                    >
                      {t.profile.edit}
                    </button>
                    <button
                      onClick={handleRemoveEmail}
                      style={{
                        ...buttonStyle,
                        background: themeColors.accentRed,
                        color: '#fee2e2',
                        border: `1px solid ${themeColors.accentRed}`,
                      }}
                    >
                      {t.profile.remove}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startVerification('email')}
                    style={buttonStyle}
                  >
                    {t.profile.add}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Phone Field */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{t.profile.phone}</label>

            {verificationState.type === 'phone' ? (
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                  <input
                    type="tel"
                    value={verificationState.newValue}
                    onChange={(e) =>
                      setVerificationState((prev) => ({ ...prev, newValue: e.target.value }))
                    }
                    placeholder={t.profile.phonePlaceholder}
                    disabled={verificationState.step === 'code'}
                    style={{
                      ...inputStyle,
                      flex: '2',
                      background: verificationState.step === 'code' ? themeColors.bgTertiary : themeColors.bgPrimary,
                    }}
                  />

                  {verificationState.step === 'password' ? (
                    <input
                      type="password"
                      value={passwordForVerification}
                      onChange={(e) => setPasswordForVerification(e.target.value)}
                      placeholder={t.verification.password}
                      style={{ ...inputStyle, flex: '1' }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder={t.verification.verificationCode}
                      style={{ ...inputStyle, flex: '1' }}
                    />
                  )}

                  <button
                    onClick={verificationState.step === 'code' ? handleVerifyCodeAndUpdate : handleVerifyPassword}
                    disabled={isLoading}
                    style={{
                      ...buttonStyle,
                      background: themeColors.accentYellow,
                      color: '#000',
                      border: 'none',
                    }}
                  >
                    {isLoading
                      ? t.common.loading
                      : verificationState.step === 'code'
                      ? t.verification.verifyCode
                      : t.verification.verifyPassword}
                  </button>

                  <button
                    onClick={cancelVerification}
                    disabled={isLoading}
                    style={buttonStyle}
                  >
                    {t.profile.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: themeColors.bgPrimary,
                    border: `1px solid ${themeColors.borderColor}`,
                    borderRadius: '4px',
                    color: userData.primaryPhone ? themeColors.textPrimary : themeColors.textTertiary,
                    fontSize: '12px',
                    fontFamily: 'var(--font-ibm-plex-mono)',
                  }}
                >
                  {userData.primaryPhone || t.profile.null}
                </div>

                <button
                  onClick={() => startVerification('phone', userData.primaryPhone || '')}
                  style={buttonStyle}
                >
                  {userData.primaryPhone ? t.profile.edit : t.profile.add}
                </button>

                {userData.primaryPhone && (
                  <button
                    onClick={handleRemovePhone}
                    style={{
                      ...buttonStyle,
                      background: themeColors.accentRed,
                      color: '#fee2e2',
                      border: `1px solid ${themeColors.accentRed}`,
                    }}
                  >
                    {t.profile.remove}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Save/Cancel Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleProfileUpdate}
              disabled={isLoading}
              style={{
                padding: '10px 16px',
                background: '#059669',
                color: '#fff',
                border: '1px solid #059669',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                fontFamily: 'var(--font-ibm-plex-mono)',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? t.profile.saving : t.profile.saveProfile}
            </button>
            <button
              onClick={() => {
                setIsEditingProfile(false);
                cancelVerification();
              }}
              disabled={isLoading}
              style={buttonStyle}
            >
              {t.profile.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}