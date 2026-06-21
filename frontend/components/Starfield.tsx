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
  baseR: number;
  vx: number;
  vy: number;
  tw: number; // twinkle phase
  tp: number; // twinkle speed
  colored: boolean;
};

type Ripple = {
  x: number;
  y: number;
  age: number;
};

/**
 * Canvas particle field: drifting, twinkling motes with emotion-tinted links,
 * mouse-reactive glow, and click ripples. It stays behind the UI while making
 * the whole page feel like an interactive emotion star map.
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
    let ripples: Ripple[] = [];
    const mouse = {
      x: 0.5,
      y: 0.5,
      px: window.innerWidth * dpr * 0.5,
      py: window.innerHeight * dpr * 0.5,
      active: false,
    };

    const build = () => {
      w = canvas.width = Math.floor(window.innerWidth * dpr);
      h = canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      mouse.px = mouse.x * w;
      mouse.py = mouse.y * h;
      const count = Math.min(170, Math.max(90, Math.floor((window.innerWidth * window.innerHeight) / 9000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random(),
        baseR: (0.6 + Math.random() * 2.1) * dpr,
        vx: (Math.random() - 0.5) * 0.16 * dpr,
        vy: (-0.03 - Math.random() * 0.12) * dpr,
        tw: Math.random() * Math.PI * 2,
        tp: 0.5 + Math.random() * 1.6,
        colored: Math.random() < 0.3,
      }));
    };
    build();

    const onResize = () => build();
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = e.clientY / window.innerHeight;
      mouse.px = e.clientX * dpr;
      mouse.py = e.clientY * dpr;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
    };
    const onClick = (e: MouseEvent) => {
      ripples.push({ x: e.clientX * dpr, y: e.clientY * dpr, age: 0 });
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("click", onClick);

    let raf = 0;
    let t = 0;
    const linkDist = 165 * dpr;
    const influence = 210 * dpr;

    const render = () => {
      t += 0.016;
      const [cr, cg, cb] = hexToRgb(colorRef.current);
      ctx.clearRect(0, 0, w, h);

      const sx = (mouse.x - 0.5) * 26 * dpr;
      const sy = (mouse.y - 0.5) * 26 * dpr;

      if (mouse.active) {
        const glow = ctx.createRadialGradient(mouse.px, mouse.py, 0, mouse.px, mouse.py, influence * 1.35);
        glow.addColorStop(0, `rgba(${cr},${cg},${cb},0.2)`);
        glow.addColorStop(0.38, `rgba(${cr},${cg},${cb},0.09)`);
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(mouse.px, mouse.py, influence * 1.35, 0, Math.PI * 2);
        ctx.fill();
      }

      ripples = ripples
        .map((ripple) => ({ ...ripple, age: ripple.age + 0.016 }))
        .filter((ripple) => ripple.age < 1);
      for (const ripple of ripples) {
        const radius = (60 + ripple.age * 360) * dpr;
        const opacity = Math.max(0, 1 - ripple.age) * 0.35;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${opacity})`;
        ctx.lineWidth = (1.5 + (1 - ripple.age) * 2) * dpr;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Emotion-tinted constellation links grow brighter near the pointer.
      ctx.lineWidth = dpr * 0.65;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const ax = a.x + sx * a.z;
          const ay = a.y + sy * a.z;
          const bx = b.x + sx * b.z;
          const by = b.y + sy * b.z;
          const dx = ax - bx;
          const dy = ay - by;
          const d2 = dx * dx + dy * dy;
          if (d2 < linkDist * linkDist) {
            const midx = (ax + bx) * 0.5;
            const midy = (ay + by) * 0.5;
            const md = Math.hypot(midx - mouse.px, midy - mouse.py);
            const hover = mouse.active ? Math.max(0, 1 - md / (influence * 1.25)) : 0;
            const o = (1 - Math.sqrt(d2) / linkDist) * (0.18 + hover * 0.32);
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${o})`;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
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

          if (mouse.active) {
            const dx = mouse.px - p.x;
            const dy = mouse.py - p.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 1 && dist < influence) {
              const pull = (1 - dist / influence) * (0.035 + p.z * 0.035);
              p.x += (dx / dist) * pull * dpr;
              p.y += (dy / dist) * pull * dpr;
            }
          }
        }
        const tw = reduce ? 0.7 : 0.45 + 0.45 * Math.sin(t * p.tp + p.tw);
        const px = p.x + sx * p.z;
        const py = p.y + sy * p.z;
        const hoverDist = mouse.active ? Math.hypot(px - mouse.px, py - mouse.py) : Infinity;
        const hover = Math.max(0, 1 - hoverDist / influence);
        const radius = p.baseR * (0.9 + 0.55 * tw + hover * 1.8);
        if (p.colored) {
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.58 * tw + hover * 0.38})`;
          ctx.shadowColor = `rgba(${cr},${cg},${cb},0.9)`;
          ctx.shadowBlur = (12 + hover * 18) * dpr;
        } else {
          ctx.fillStyle = `rgba(255,255,255,${0.62 * tw + hover * 0.28})`;
          ctx.shadowColor = hover > 0 ? `rgba(${cr},${cg},${cb},0.72)` : "rgba(255,255,255,0.55)";
          ctx.shadowBlur = (4 + hover * 16) * dpr;
        }
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
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
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("click", onClick);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 -z-10" />;
}
