'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  dx: number;
  dy: number;
  comet: boolean;
  len?: number;
  ang?: number;
  z: number;
  d: number;
  tp: number;
  ts: number;
}

class Starfall {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr: number;
  particles: Star[] = [];
  size = { w: 0, h: 0 };
  t = 0;
  mouse = { x: 0, y: 0 };
  raf: number | null = null;
  resizeHandler: () => void;
  mouseHandler: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.resizeHandler = () => this.setup();
    this.mouseHandler = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      this.mouse.x = (e.clientX - cx) / cx * 11;
      this.mouse.y = (e.clientY - cy) / cy * 11;
    };

    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('mousemove', this.mouseHandler);
    this.setup();
    this.run();
  }

  setup() {
    const p = this.canvas.parentElement;
    if (!p) return;
    const W = p.offsetWidth;
    const H = p.offsetHeight;
    this.size = { w: W, h: H };
    this.canvas.width = W * this.dpr;
    this.canvas.height = H * this.dpr;
    this.canvas.style.width = W + 'px';
    this.canvas.style.height = H + 'px';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
    this.particles = [];
    for (let i = 0; i < 130; i++) this.particles.push(this.spawn());
    this.particles.sort((a, b) => a.z - b.z);
  }

  spawn(): Star {
    const r = Math.random();
    const z = r < 0.15 ? 0 : r < 0.3 ? 0.25 : r < 0.55 ? 0.5 : r < 0.75 ? 0.75 : 1;
    const comet = Math.random() < 0.09;
    if (comet) {
      const ang = Math.PI / 3 + (Math.random() - 0.5) * 0.7;
      const spd = (Math.random() * 1.8 + 2) * (0.4 + z * 0.6);
      return {
        x: Math.random() * this.size.w,
        y: Math.random() * this.size.h,
        size: (Math.random() * 0.7 + 0.5) * (1.2 + z),
        alpha: 0,
        dx: Math.cos(ang) * spd,
        dy: Math.sin(ang) * spd,
        comet: true,
        len: (Math.random() * 20 + 12) * (0.5 + z * 0.5),
        ang,
        z,
        ts: 0.02 + Math.random() * 0.017,
        tp: 0,
        d: 0,
      };
    }
    const d = 0.3 + z * 0.7;
    return {
      x: Math.random() * this.size.w,
      y: Math.random() * this.size.h,
      size: (Math.random() * 1 + 0.3) * d * 1.2,
      alpha: (Math.random() * 0.42 + 0.13) * d * (0.4 + z * 0.6),
      dx: 0.11 * d + (Math.random() - 0.5) * 0.04,
      dy: 0.08 * d + (Math.random() - 0.5) * 0.04,
      comet: false,
      z,
      d,
      tp: Math.random() * Math.PI * 2,
      ts: Math.random() * 0.032 + 0.014,
    };
  }

  star(p: Star) {
    const tw = Math.sin(this.t * p.ts + p.tp);
    const pulse = Math.pow((tw + 1) / 2, 2);
    const fa = p.alpha * (0.12 + pulse * 0.88);
    const fs = p.size * (0.65 + pulse * 0.55);
    const bl = Math.abs(p.z - 0.7) * 2;
    if (bl > 0.3) this.ctx.filter = `blur(${bl}px)`;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, fs, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(255,255,255,${fa})`;
    this.ctx.fill();
    if (pulse > 0.55 && p.z > 0.4) {
      const g = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, fs * 3);
      g.addColorStop(0, `rgba(255,255,255,${fa * 0.12})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, fs * 3, 0, Math.PI * 2);
      this.ctx.fillStyle = g;
      this.ctx.fill();
    }
    this.ctx.filter = 'none';
  }

  comet(p: Star) {
    if (p.alpha <= 0.01) return;
    const bl = Math.abs(p.z - 0.7) * 2;
    if (bl > 0.3) this.ctx.filter = `blur(${bl}px)`;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(255,255,255,${Math.min(p.alpha, 0.72)})`;
    this.ctx.fill();
    const ex = p.x - Math.cos(p.ang!) * p.len!;
    const ey = p.y - Math.sin(p.ang!) * p.len!;
    const g = this.ctx.createLinearGradient(p.x, p.y, ex, ey);
    g.addColorStop(0, `rgba(255,255,255,${p.alpha * 0.28})`);
    g.addColorStop(0.5, `rgba(255,255,255,${p.alpha * 0.09})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    this.ctx.strokeStyle = g;
    this.ctx.lineWidth = p.size * 1.5;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(p.x, p.y);
    this.ctx.lineTo(ex, ey);
    this.ctx.stroke();
    this.ctx.filter = 'none';
  }

  run() {
    this.raf = requestAnimationFrame(() => this.run());
    this.t++;
    this.ctx.clearRect(0, 0, this.size.w, this.size.h);
    this.particles.sort((a, b) => a.z - b.z);
    const { w: W, h: H } = this.size;
    this.particles.forEach((p) => {
      const ps = (p.z - 0.5) * 2;
      const mx = this.mouse.x * ps * 0.38;
      const my = this.mouse.y * ps * 0.38;
      if (p.comet) {
        if (p.alpha < 0.55) p.alpha += p.ts;
        p.x += p.dx;
        p.y += p.dy;
        if (p.x > W + 50 || p.y > H + 50 || p.x < -50 || p.y < -50) {
          Object.assign(p, { ...this.spawn(), comet: true, alpha: 0 });
        }
        this.comet({ ...p, x: p.x + mx, y: p.y + my });
      } else {
        p.x += p.dx;
        p.y += p.dy;
        if (p.y > H + 8) {
          p.y = -8;
          p.x = Math.random() * W;
        }
        if (p.x > W + 8) {
          p.x = -8;
          p.y = Math.random() * H;
        } else if (p.x < -8) {
          p.x = W + 8;
          p.y = Math.random() * H;
        }
        this.star({ ...p, x: p.x + mx, y: p.y + my });
      }
    });
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('mousemove', this.mouseHandler);
  }
}

export default function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const starfall = new Starfall(canvasRef.current);
    return () => starfall.destroy();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
