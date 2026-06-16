'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ImageCropperRef } from '../components/dashboard/shared/ImageCropper';
import type { ActionResult } from '../logic/actions/safe';
import { useAvatarUpload } from './use-avatar-upload';

export interface UseAvatarModalOptions {
  /** Current saved avatar URL (empty string means no avatar) */
  savedAvatarUrl: string;
  onUpdateAvatarUrl: (avatarUrl: string) => Promise<ActionResult>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  refreshData: () => void;
  /** Translation strings */
  t: {
    avatarUpdated: string;
    avatarRemoved: string;
    avatarInvalidType: string;
    avatarTooLarge: string;
    cropFailed: string;
  };
}

export interface UseAvatarModalReturn {
  /** Whether the avatar modal is open */
  isOpen: boolean;
  /** Open the avatar modal */
  open: () => void;
  /** Close the modal, revoking any preview Object URL */
  close: () => void;
  /** Whether a remove-avatar operation is in progress */
  isRemoving: boolean;
  /** Whether a file upload/crop is in progress */
  isUploading: boolean;
  /** Selected file for cropping */
  selectedFile: File | null;
  /** Object URL for the crop preview */
  cropPreviewUrl: string | null;
  /** Whether we are in crop mode (a file has been selected) */
  inCropMode: boolean;
  /** Whether the drop zone is being hovered/dragged over */
  isDragging: boolean;
  /** Ref to pass to the file <input> (gallery/desktop) */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  /** Ref to pass to the camera <input> (mobile) */
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  /** Ref to pass to the ImageCropper component */
  cropperRef: React.RefObject<ImageCropperRef | null>;
  /** Handle a file being selected (validation + Object URL creation) */
  handleFileSelected: (file: File) => void;
  /** onChange handler for file <input> elements */
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Remove the current avatar from the server */
  handleRemoveAvatar: () => Promise<void>;
  /** Crop the selected image and upload it */
  handleApplyCrop: () => Promise<void>;
  /** Drag-over handler (set isDragging) */
  handleDragOver: (e: React.DragEvent) => void;
  /** Drag-leave handler (clear isDragging) */
  handleDragLeave: () => void;
  /** Drop handler (pick file from dataTransfer) */
  handleDrop: (e: React.DragEvent) => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

export function useAvatarModal({
  savedAvatarUrl: _savedAvatarUrl,
  onUpdateAvatarUrl,
  onSuccess,
  onError,
  refreshData,
  t,
}: UseAvatarModalOptions): UseAvatarModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<ImageCropperRef>(null);

  // Keep a ref to the current cropPreviewUrl for use inside async callbacks
  // (avoids stale closure over state value)
  const cropPreviewUrlRef = useRef<string | null>(null);
  useEffect(() => { cropPreviewUrlRef.current = cropPreviewUrl; }, [cropPreviewUrl]);

  const { upload, isUploading, clearError } = useAvatarUpload({
    onSuccess: async (url: string) => {
      const result = await onUpdateAvatarUrl(url);
      if (!result.ok) { onError(result.error); return; }
      onSuccess(t.avatarUpdated);
      refreshData();
      setIsOpen(false);
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

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    if (cropPreviewUrl) {
      URL.revokeObjectURL(cropPreviewUrl);
    }
    setCropPreviewUrl(null);
    setSelectedFile(null);
    setIsOpen(false);
  }, [cropPreviewUrl]);

  const handleFileSelected = useCallback((file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      onError(t.avatarInvalidType);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      onError(t.avatarTooLarge);
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
    setIsRemoving(true);
    try {
      const result = await onUpdateAvatarUrl('');
      if (!result.ok) { onError(result.error); return; }
      onSuccess(t.avatarRemoved);
      refreshData();
      setIsOpen(false);
    } finally {
      setIsRemoving(false);
    }
  }, [onUpdateAvatarUrl, onSuccess, onError, refreshData, t]);

  const handleApplyCrop = useCallback(async () => {
    if (!cropperRef.current || !selectedFile) return;
    const blob = await cropperRef.current.cropToBlob();
    if (!blob) {
      onError(t.cropFailed);
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
  }, [selectedFile, upload, onError, t]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelected(f);
  }, [handleFileSelected]);

  return {
    isOpen,
    open,
    close,
    isRemoving,
    isUploading,
    selectedFile,
    cropPreviewUrl,
    inCropMode: !!cropPreviewUrl,
    isDragging,
    fileInputRef,
    cameraInputRef,
    cropperRef,
    handleFileSelected,
    handleFileInputChange,
    handleRemoveAvatar,
    handleApplyCrop,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
