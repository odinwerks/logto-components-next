'use client';

import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { ThemeSpec } from '../../../themes';
import { readEnv } from '../../../logic/env';

const CANVAS_SIZE = 512;
const CROP_SIZE = 460;
const CROP_X = (CANVAS_SIZE - CROP_SIZE) / 2;
const CROP_Y = (CANVAS_SIZE - CROP_SIZE) / 2;
const OVERSCROLL_DAMPING = 0.3;
const SNAP_DURATION = 200;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).beginPath();
    (ctx as any).roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

function drawThirdsLinesRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  for (const frac of [1 / 3, 2 / 3]) {
    ctx.beginPath();
    ctx.moveTo(x + w * frac, y);
    ctx.lineTo(x + w * frac, y + h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + h * frac);
    ctx.lineTo(x + w, y + h * frac);
    ctx.stroke();
  }
  ctx.restore();
}

function drawThirdsLinesCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  for (const frac of [1 / 3, 2 / 3]) {
    const off = r * (2 * frac - 1);
    const halfW = Math.sqrt(Math.max(0, r * r - off * off));
    ctx.beginPath();
    ctx.moveTo(cx - halfW, cy + off);
    ctx.lineTo(cx + halfW, cy + off);
    ctx.stroke();
    const halfH = Math.sqrt(Math.max(0, r * r - off * off));
    ctx.beginPath();
    ctx.moveTo(cx + off, cy - halfH);
    ctx.lineTo(cx + off, cy + halfH);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCircleMask(ctx: CanvasRenderingContext2D) {
  const cx = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE / 2;
  const r = CROP_SIZE / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawThirdsLinesCircle(ctx, cx, cy, r);
  ctx.restore();
}

function drawRectMask(ctx: CanvasRenderingContext2D) {
  const x = CROP_X;
  const y = CROP_Y;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.rect(x, y, CROP_SIZE, CROP_SIZE);
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, CROP_SIZE, CROP_SIZE);

  drawThirdsLinesRect(ctx, x, y, CROP_SIZE, CROP_SIZE);
  ctx.restore();
}

function drawRoundedSqMask(ctx: CanvasRenderingContext2D) {
  const x = CROP_X;
  const y = CROP_Y;
  const r = CROP_SIZE * 0.2;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  ctx.globalCompositeOperation = 'destination-out';
  drawRoundedRect(ctx, x, y, CROP_SIZE, CROP_SIZE, r);
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';
  drawRoundedRect(ctx, x, y, CROP_SIZE, CROP_SIZE, r);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawThirdsLinesRect(ctx, x, y, CROP_SIZE, CROP_SIZE);
  ctx.restore();
}

function drawMask(ctx: CanvasRenderingContext2D, shape: string) {
  if (shape === 'circle') drawCircleMask(ctx);
  else if (shape === 'rsq') drawRoundedSqMask(ctx);
  else drawRectMask(ctx);
}

function drawImageOnCanvas(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  scale: number,
  offset: { x: number; y: number },
) {
  const imgW = img.naturalWidth * scale;
  const imgH = img.naturalHeight * scale;
  const x = CROP_X + (CROP_SIZE - imgW) / 2 + offset.x;
  const y = CROP_Y + (CROP_SIZE - imgH) / 2 + offset.y;
  ctx.drawImage(img, x, y, imgW, imgH);
}

function clampOffset(
  img: HTMLImageElement,
  s: number,
  ox: number,
  oy: number,
) {
  const imgW = img.naturalWidth * s;
  const imgH = img.naturalHeight * s;
  const maxX = Math.max(0, (imgW - CROP_SIZE) / 2);
  const maxY = Math.max(0, (imgH - CROP_SIZE) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, ox)),
    y: Math.max(-maxY, Math.min(maxY, oy)),
  };
}

function applyOverscroll(
  img: HTMLImageElement,
  s: number,
  rawX: number,
  rawY: number,
) {
  const clamped = clampOffset(img, s, rawX, rawY);
  const dx = rawX - clamped.x;
  const dy = rawY - clamped.y;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return clamped;
  return {
    x: clamped.x + dx * OVERSCROLL_DAMPING,
    y: clamped.y + dy * OVERSCROLL_DAMPING,
  };
}

export interface ImageCropperRef {
  cropToBlob: () => Promise<Blob | null>;
}

interface ImageCropperProps {
  imageUrl: string;
  shape?: 'circle' | 'sq' | 'rsq';
  outputSize?: number;
  displaySize?: number;
  theme: ThemeSpec;
}

export const ImageCropper = forwardRef<ImageCropperRef, ImageCropperProps>(
  ({ imageUrl, shape: shapeProp, outputSize = 512, displaySize = 180, theme }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [minScale, setMinScale] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [isSnapping, setIsSnapping] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
    const scaleRef = useRef(scale);
    const offsetRef = useRef(offset);
    const imageRef = useRef(image);
    const snapAnimRef = useRef<number | null>(null);

    useEffect(() => { scaleRef.current = scale; }, [scale]);
    useEffect(() => { offsetRef.current = offset; }, [offset]);
    useEffect(() => { imageRef.current = image; }, [image]);

    const shape = shapeProp ?? (readEnv('USER_SHAPE') as 'circle' | 'sq' | 'rsq') ?? 'circle';

    useEffect(() => {
      return () => {
        if (snapAnimRef.current) cancelAnimationFrame(snapAnimRef.current);
      };
    }, []);

    useEffect(() => {
      const img = new Image();
      if (!imageUrl.startsWith('blob:') && !imageUrl.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        setImage(img);
        const raw = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
        const ms = raw * 0.95;
        setMinScale(ms);
        setScale(ms);
        setOffset({ x: 0, y: 0 });
      };
      img.onerror = () => {
        console.error('Failed to load image for cropping');
      };
      img.src = imageUrl;
    }, [imageUrl]);

    const snapBack = useCallback(() => {
      if (!imageRef.current) return;
      const startOff = { ...offsetRef.current };
      const target = clampOffset(imageRef.current, scaleRef.current, startOff.x, startOff.y);
      if (Math.abs(startOff.x - target.x) < 0.5 && Math.abs(startOff.y - target.y) < 0.5) {
        setOffset(target);
        setIsSnapping(false);
        return;
      }
      setIsSnapping(true);
      const startTime = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / SNAP_DURATION);
        const ease = 1 - Math.pow(1 - t, 3);
        setOffset({
          x: startOff.x + (target.x - startOff.x) * ease,
          y: startOff.y + (target.y - startOff.y) * ease,
        });
        if (t < 1) {
          snapAnimRef.current = requestAnimationFrame(animate);
        } else {
          setOffset(target);
          setIsSnapping(false);
          snapAnimRef.current = null;
        }
      };
      snapAnimRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
      if (!image || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      drawImageOnCanvas(ctx, image, scale, offset);
      drawMask(ctx, shape);
    }, [image, scale, offset, shape]);

    const handleWheel = useCallback(
      (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!imageRef.current) return;
        const delta = e.deltaY > 0 ? -0.03 : 0.03;
        const newScale = Math.max(minScale, Math.min(minScale * 3, scaleRef.current + delta));
        setScale(newScale);
        const clamped = clampOffset(imageRef.current, newScale, offsetRef.current.x, offsetRef.current.y);
        setOffset(clamped);
      },
      [minScale],
    );

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (snapAnimRef.current) {
        cancelAnimationFrame(snapAnimRef.current);
        snapAnimRef.current = null;
        setIsSnapping(false);
      }
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX, y: e.clientY,
        ox: offsetRef.current.x, oy: offsetRef.current.y,
      };
    }, []);

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging || !dragStartRef.current || !imageRef.current) return;
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const dx = (e.clientX - dragStartRef.current.x) * (CANVAS_SIZE / rect.width);
        const dy = (e.clientY - dragStartRef.current.y) * (CANVAS_SIZE / rect.height);
        const rawX = dragStartRef.current.ox + dx;
        const rawY = dragStartRef.current.oy + dy;
        const result = applyOverscroll(imageRef.current, scaleRef.current, rawX, rawY);
        setOffset(result);
      },
      [isDragging],
    );

    const endDrag = useCallback(() => {
      if (isDragging) {
        setIsDragging(false);
        dragStartRef.current = null;
        snapBack();
      }
    }, [isDragging, snapBack]);

    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (snapAnimRef.current) {
        cancelAnimationFrame(snapAnimRef.current);
        snapAnimRef.current = null;
        setIsSnapping(false);
      }
      setIsDragging(true);
      dragStartRef.current = {
        x: touch.clientX, y: touch.clientY,
        ox: offsetRef.current.x, oy: offsetRef.current.y,
      };
    }, []);

    const handleTouchMove = useCallback(
      (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDragging || !dragStartRef.current || !imageRef.current || e.touches.length !== 1) return;
        const touch = e.touches[0];
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const dx = (touch.clientX - dragStartRef.current.x) * (CANVAS_SIZE / rect.width);
        const dy = (touch.clientY - dragStartRef.current.y) * (CANVAS_SIZE / rect.height);
        const rawX = dragStartRef.current.ox + dx;
        const rawY = dragStartRef.current.oy + dy;
        const result = applyOverscroll(imageRef.current, scaleRef.current, rawX, rawY);
        setOffset(result);
      },
      [isDragging],
    );

    const handleTouchEnd = useCallback(() => {
      if (isDragging) {
        setIsDragging(false);
        dragStartRef.current = null;
        snapBack();
      }
    }, [isDragging, snapBack]);

    const handleZoomIn = useCallback(() => {
      if (!imageRef.current) return;
      const step = minScale * 0.15;
      const newScale = Math.min(minScale * 3, scaleRef.current + step);
      setScale(newScale);
      setOffset(clampOffset(imageRef.current, newScale, offsetRef.current.x, offsetRef.current.y));
    }, [minScale]);

    const handleZoomOut = useCallback(() => {
      if (!imageRef.current) return;
      const step = minScale * 0.15;
      const newScale = Math.max(minScale, scaleRef.current - step);
      setScale(newScale);
      setOffset(clampOffset(imageRef.current, newScale, offsetRef.current.x, offsetRef.current.y));
    }, [minScale]);

    const handleZoomReset = useCallback(() => {
      if (!imageRef.current) return;
      setScale(minScale);
      setOffset(clampOffset(imageRef.current, minScale, 0, 0));
    }, [minScale]);

    useImperativeHandle(
      ref,
      () => ({
        cropToBlob: () =>
          new Promise<Blob | null>((resolve) => {
            const img = imageRef.current;
            if (!img) {
              resolve(null);
              return;
            }
            const clampedOff = clampOffset(img, scaleRef.current, offsetRef.current.x, offsetRef.current.y);
            const canvas = document.createElement('canvas');
            canvas.width = outputSize;
            canvas.height = outputSize;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }

            const scaleFactor = outputSize / CROP_SIZE;
            const s = scaleRef.current * scaleFactor;
            const imgW = img.naturalWidth * s;
            const imgH = img.naturalHeight * s;
            const x = (outputSize - imgW) / 2 + clampedOff.x * scaleFactor;
            const y = (outputSize - imgH) / 2 + clampedOff.y * scaleFactor;

            ctx.drawImage(img, x, y, imgW, imgH);
            canvas.toBlob((blob) => resolve(blob), 'image/png', 0.92);
          }),
      }),
      [outputSize],
    );

    const c = theme.colors;
    const ty = theme.tokens.typography;
    const zoomPct = minScale > 0 ? Math.round((scale / minScale) * 100) : 100;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleZoomReset}
          style={{
            width: `${displaySize}px`,
            height: `${displaySize}px`,
            cursor: isDragging ? 'grabbing' : isSnapping ? 'default' : 'grab',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            borderRadius: theme.tokens.radii?.md ?? '0.375rem',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: `${displaySize}px` }}>
          <button
            onClick={handleZoomOut}
            style={{
              width: '1.75rem', height: '1.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: c.bgTertiary, border: `1px solid ${c.borderColor}`,
              borderRadius: '0.25rem', cursor: 'pointer', color: c.textSecondary,
              flexShrink: 0, padding: 0, fontSize: '1rem', lineHeight: 1,
            }}
            title="Zoom out"
          >
            −
          </button>
          <input
            type="range"
            min={minScale}
            max={minScale * 3}
            step={minScale * 0.005}
            value={scale}
            onChange={(e) => {
              const ns = parseFloat(e.target.value);
              setScale(ns);
              if (imageRef.current) {
                setOffset(clampOffset(imageRef.current, ns, offsetRef.current.x, offsetRef.current.y));
              }
            }}
            style={{
              flex: 1,
              accentColor: c.accentBlue,
              cursor: 'pointer',
              height: '4px',
            }}
          />
          <button
            onClick={handleZoomIn}
            style={{
              width: '1.75rem', height: '1.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: c.bgTertiary, border: `1px solid ${c.borderColor}`,
              borderRadius: '0.25rem', cursor: 'pointer', color: c.textSecondary,
              flexShrink: 0, padding: 0, fontSize: '1rem', lineHeight: 1,
            }}
            title="Zoom in"
          >
            +
          </button>
          <span style={{
            fontFamily: ty.fontMono, fontSize: ty.size.xs, color: c.textTertiary,
            minWidth: '2.5rem', textAlign: 'right', flexShrink: 0,
          }}>
            {zoomPct}%
          </span>
        </div>
        <p style={{
          margin: 0,
          fontSize: ty.size.micro,
          color: c.textTertiary,
          fontFamily: ty.fontSans,
          textAlign: 'center',
        }}>
          Drag to move · Scroll or +/− to zoom · Double-click to reset
        </p>
      </div>
    );
  },
);

ImageCropper.displayName = 'ImageCropper';