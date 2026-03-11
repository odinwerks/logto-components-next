'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchUserBadgeData } from '@/app/logto-kit/logic/actions'

export interface UseAvatarUploadOptions {
  userId: string
  onSuccess?: (url: string) => void
  onError?: (message: string) => void
}

export interface UseAvatarUploadReturn {
  upload: (file: File) => Promise<string | null>
  isUploading: boolean
  error: string | null
  clearError: () => void
}

export function useAvatarUpload({
  userId,
  onSuccess,
  onError,
}: UseAvatarUploadOptions): UseAvatarUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
  })

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setIsUploading(true)
      setError(null)

      try {
        const badgeData = await fetchUserBadgeData()

        if (!badgeData.success || !badgeData.accessToken) {
          throw new Error('Could not retrieve session token. Are you logged in?')
        }

        const { accessToken } = badgeData

        const formData = new FormData()
        formData.append('file', file)
        formData.append('accessToken', accessToken)
        formData.append('userId', userId)

        const uploadRes = await fetch('/api/upload-avatar', {
          method: 'POST',
          body: formData,
        })

        const uploadBody = await uploadRes.json().catch(() => ({})) as {
          url?: string
          error?: string
        }

        if (!uploadRes.ok) {
          throw new Error(uploadBody.error ?? `Upload failed (HTTP ${uploadRes.status}).`)
        }

        if (!uploadBody.url) {
          throw new Error('Upload succeeded but no URL was returned. Check server logs.')
        }

        onSuccessRef.current?.(uploadBody.url)
        return uploadBody.url
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred.'
        setError(message)
        onErrorRef.current?.(message)
        return null
      } finally {
        setIsUploading(false)
      }
    },
    [userId],
  )

  const clearError = useCallback(() => setError(null), [])

  return { upload, isUploading, error, clearError }
}
