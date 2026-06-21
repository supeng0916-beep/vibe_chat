"use client";

import { useEffect, useRef } from "react";
import { useVibeStore } from "@/lib/store";

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [139, 92, 246];
}

type Particle = {
  x: number;
  y: number;
  z: number; // depth 0..1 for parallax
  r: number;
  vx: number;
  vy: number;
  tw: number; // twinkle phase
  tp: number; // twinkle speed
  colored: boolean;
};

/**
 * Canvas particle field: drifting, twinkling motes with soft glow, gentle
 * mouse parallax and faint constellation links. A subset is tinted with the
 * current emotion color so the atmosphere breathes with how you feel.
 */
export function Starfield() {
  const color = useVibeStore((s) => s.emotion?.color);
  const colorRef = useRef("#8b5cf6");
  colorRef.current = color || "#8b5cf6";
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let particles: Particle[] = [];
    const mouse = { x: 0.5, y: 0.5 };

    const build = () => {
      w = canvas.width = Math.floor(window.innerWidth * dpr);
      h = canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const count = Math.min(110, Math.floor((window.innerWidth * window.innerHeight) / 14000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random(),
        r: (0.4 + Math.random() * 1.5) * dpr,
        vx: (Math.random() - 0.5) * 0.1 * dpr,
        vy: (-0.02 - Math.random() * 0.08) * dpr,
        tw: Math.random() * Math.PI * 2,
        tp: 0.5 + Math.random() * 1.6,
        colored: Math.random() < 0.2,
      }));
    };
    build();

    const onResize = () => build();
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = e.clientY / window.innerHeight;
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);

    let raf = 0;
    let t = 0;
    const linkDist = 130 * dpr;

    const render = () => {
      t += 0.016;
      const [cr, cg, cb] = hexToRgb(colorRef.current);
      ctx.clearRect(0, 0, w, h);

      const sx = (mouse.x - 0.5) * 26 * dpr;
      const sy = (mouse.y - 0.5) * 26 * dpr;

      // faint constellation links (subtle, emotion-tinted)
      ctx.lineWidth = dpr * 0.5;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < linkDist * linkDist) {
            const o = (1 - Math.sqrt(d2) / linkDist) * 0.12;
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${o})`;
            ctx.beginPath();
            ctx.moveTo(a.x + sx * a.z, a.y + sy * a.z);
            ctx.lineTo(b.x + sx * b.z, b.y + sy * b.z);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        if (!reduce) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -6) p.y = h + 6;
          if (p.x < -6) p.x = w + 6;
          if (p.x > w + 6) p.x = -6;
        }
        const tw = reduce ? 0.7 : 0.45 + 0.45 * Math.sin(t * p.tp + p.tw);
        const px = p.x + sx * p.z;
        const py = p.y + sy * p.z;
        if (p.colored) {
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.55 * tw})`;
          ctx.shadowColor = `rgba(${cr},${cg},${cb},0.9)`;
          ctx.shadowBlur = 10 * dpr;
        } else {
          ctx.fillStyle = `rgba(255,255,255,${0.7 * tw})`;
          ctx.shadowColor = "rgba(255,255,255,0.55)";
          ctx.shadowBlur = 3 * dpr;
        }
        ctx.beginPath();
        ctx.arc(px, py, p.r * (0.8 + 0.5 * tw), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 -z-10" />;
}
