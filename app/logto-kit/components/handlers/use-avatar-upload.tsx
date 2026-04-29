'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { uploadAvatar } from '@/app/logto-kit/logic/actions'

export interface UseAvatarUploadOptions {
  /**
   * @deprecated The user ID is now derived server-side from the session.
   * Kept in the API for backwards compatibility but ignored.
   */
  userId?: string
  onSuccess?: (url: string) => void
  onError?: (message: string) => void
}

export interface UseAvatarUploadReturn {
  upload: (file: File) => Promise<string | null>
  isUploading: boolean
  error: string | null
  clearError: () => void
}

/**
 * Upload an avatar image for the currently signed-in user.
 *
 * Security model (Phase 1): the access token and userId are NOT sent from
 * the client. `uploadAvatar` is a Server Action — Next.js enforces
 * same-origin automatically, and the server derives the authenticated user
 * from its own session cookie.
 */
export function useAvatarUpload({
  onSuccess,
  onError,
}: UseAvatarUploadOptions = {}): UseAvatarUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setIsUploading(true)
      setError(null)

      try {
        const formData = new FormData()
        formData.append('file', file)

        const { url } = await uploadAvatar(formData)

        if (!url) {
          throw new Error('UPLOAD_FAILED')
        }

        onSuccessRef.current?.(url)
        return url
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'UPLOAD_FAILED'
        setError(message)
        onErrorRef.current?.(message)
        return null
      } finally {
        setIsUploading(false)
      }
    },
    [],
  )

  const clearError = useCallback(() => setError(null), [])

  return { upload, isUploading, error, clearError }
}
