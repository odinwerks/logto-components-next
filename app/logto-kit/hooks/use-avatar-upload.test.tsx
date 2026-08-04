import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAvatarUpload } from './use-avatar-upload';
import { uploadAvatar } from '../logic/actions/avatar';
import type { DataResult } from '../logic/actions/safe';

vi.mock('../logic/actions/avatar', () => ({
  uploadAvatar: vi.fn(),
}));

describe('useAvatarUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upload avatar successfully', async () => {
    vi.mocked(uploadAvatar).mockResolvedValueOnce({
      ok: true,
      data: { url: 'https://avatar.url/image.png' },
    });

    const { result } = renderHook(() => useAvatarUpload());
    const file = new File([''], 'avatar.png', { type: 'image/png' });

    let uploadPromise: Promise<string | null> = Promise.resolve(null);
    act(() => {
      uploadPromise = result.current.upload(file);
    });

    // isUploading should be true immediately
    expect(result.current.isUploading).toBe(true);

    const url = await act(async () => {
      return await uploadPromise;
    });

    expect(url).toBe('https://avatar.url/image.png');
    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should prevent concurrent uploads', async () => {
    let resolveUpload: (value: DataResult<{ url: string }>) => void = () => {};
    const delayPromise = new Promise<DataResult<{ url: string }>>((resolve) => {
      resolveUpload = resolve;
    });

    vi.mocked(uploadAvatar).mockImplementationOnce(() => delayPromise);

    const { result } = renderHook(() => useAvatarUpload());
    const file = new File([''], 'avatar.png', { type: 'image/png' });

    let p1: Promise<string | null> = Promise.resolve(null);
    act(() => {
      p1 = result.current.upload(file);
    });

    expect(result.current.isUploading).toBe(true);

    // Try a second upload while first is in progress
    let p2: Promise<string | null> = Promise.resolve(null);
    act(() => {
      p2 = result.current.upload(file);
    });

    const r2 = await p2;
    expect(r2).toBeNull(); // Second upload should return null immediately
    expect(uploadAvatar).toHaveBeenCalledTimes(1); // Only one API call made

    // Resolve first upload
    await act(async () => {
      resolveUpload({
        ok: true,
        data: { url: 'https://avatar.url/image.png' },
      });
      await p1;
    });

    expect(result.current.isUploading).toBe(false);
  });

  it('stays locked until the async success callback finishes', async () => {
    vi.mocked(uploadAvatar).mockResolvedValue({
      ok: true,
      data: { url: 'https://avatar.url/image.png' },
    });
    let finishPersistence: () => void = () => {};
    const persistence = new Promise<void>((resolve) => { finishPersistence = resolve; });
    const onSuccess = vi.fn(() => persistence);
    const { result } = renderHook(() => useAvatarUpload({ onSuccess }));
    const file = new File([''], 'avatar.png', { type: 'image/png' });

    let firstUpload!: Promise<string | null>;
    act(() => { firstUpload = result.current.upload(file); });

    await act(async () => { await Promise.resolve(); });
    expect(onSuccess).toHaveBeenCalledWith('https://avatar.url/image.png');
    expect(result.current.isUploading).toBe(true);

    let overlappingResult: string | null = 'not-null';
    await act(async () => {
      overlappingResult = await result.current.upload(file);
    });
    expect(overlappingResult).toBeNull();
    expect(uploadAvatar).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishPersistence();
      await firstUpload;
    });
    expect(result.current.isUploading).toBe(false);
  });

  it('reports an async success-callback rejection once and returns null', async () => {
    vi.mocked(uploadAvatar).mockResolvedValue({
      ok: true,
      data: { url: 'https://avatar.url/image.png' },
    });
    const onError = vi.fn();
    const { result } = renderHook(() => useAvatarUpload({
      onSuccess: async () => { throw new Error('UPDATE_FAILED'); },
      onError,
    }));
    const file = new File([''], 'avatar.png', { type: 'image/png' });

    let uploadedUrl: string | null = 'pending';
    await act(async () => {
      uploadedUrl = await result.current.upload(file);
    });

    expect(uploadedUrl).toBeNull();
    expect(result.current.error).toBe('UPDATE_FAILED');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('UPDATE_FAILED');
  });
});
