"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

type Point = { valence: number; arousal: number; color: string };

type Props = {
  valence: number;
  arousal: number;
  color: string;
  partner?: Point | null;
  variant?: "full" | "compact";
  showCandidates?: boolean;
  scanning?: boolean;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
// valence -1..1 -> 8%..92% ; arousal 0..1 -> bottom(92%)..top(8%)
const toX = (v: number) => clamp(50 + v * 42, 6, 94);
const toY = (a: number) => clamp(92 - a * 84, 6, 94);

export function EmotionMap({
  valence,
  arousal,
  color,
  partner,
  variant = "full",
  showCandidates = false,
  scanning = false,
}: Props) {
  const compact = variant === "compact";
  const x = toX(valence);
  const y = toY(arousal);

  const [candidates, setCandidates] = useState<{ x: number; y: number; s: number; d: number }[]>([]);
  useEffect(() => {
    if (!showCandidates) return;
    setCandidates(
      Array.from({ length: 9 }, () => ({
        x: 8 + Math.random() * 84,
        y: 8 + Math.random() * 84,
        s: 3 + Math.random() * 4,
        d: Math.random() * 4,
      })),
    );
  }, [showCandidates]);

  const px = partner ? toX(partner.valence) : 0;
  const py = partner ? toY(partner.arousal) : 0;

  const quadrants = useMemo(
    () => [
      { label: "焦虑风暴", sub: "⚡", cls: "left-3 top-3 text-violet-300/70" },
      { label: "兴奋广场", sub: "🔆", cls: "right-3 top-3 text-orange-300/70 text-right" },
      { label: "低落深海", sub: "🌊", cls: "left-3 bottom-3 text-sky-300/70" },
      { label: "平静海湾", sub: "🌙", cls: "right-3 bottom-3 text-teal-300/70 text-right" },
    ],
    [],
  );

  return (
    <div
      className={`panel va-grid relative w-full overflow-hidden rounded-2xl ${compact ? "h-40" : "h-[22rem]"}`}
      style={{ background: `radial-gradient(120% 120% at ${x}% ${y}%, ${color}22, transparent 55%)` }}
    >
      {/* axes */}
      <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
      <div className="absolute top-1/2 h-px w-full bg-white/10" />

      {!compact && (
        <>
          {quadrants.map((q) => (
            <div key={q.label} className={`absolute ${q.cls} text-[11px] font-medium leading-tight`}>
              <div>{q.sub}</div>
              {q.label}
            </div>
          ))}
          <div className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] text-faint">高唤醒</div>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-faint">低唤醒</div>
        </>
      )}

      {/* ambient candidate stars (matching) */}
      {candidates.map((c, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white/40 animate-twinkle"
          style={{ left: `${c.x}%`, top: `${c.y}%`, width: c.s, height: c.s, animationDelay: `${c.d}s` }}
        />
      ))}

      {/* connecting light line + partner star */}
      {partner && (
        <>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <motion.line
              x1={x}
              y1={y}
              x2={px}
              y2={py}
              stroke={color}
              strokeWidth={0.5}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.8 }}
              transition={{ duration: 1, delay: 0.8, ease: "easeInOut" }}
            />
          </svg>
          <motion.div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            initial={{ left: "50%", top: "0%", opacity: 0, scale: 0.4 }}
            animate={{ left: `${px}%`, top: `${py}%`, opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <Star color={partner.color} label="TA" />
          </motion.div>
        </>
      )}

      {/* scanning pulse rings emanating from your star */}
      {scanning &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={`ring-${i}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{ left: `${x}%`, top: `${y}%`, borderColor: color }}
            initial={{ width: 12, height: 12, opacity: 0.5 }}
            animate={{ width: 220, height: 220, opacity: 0 }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: "easeOut" }}
          />
        ))}

      {/* you */}
      <motion.div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${x}%`, top: `${y}%` }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.2 }}
      >
        <Star color={color} label={compact ? "" : "你"} big />
      </motion.div>
    </div>
  );
}

function Star({ color, label, big = false }: { color: string; label: string; big?: boolean }) {
  const size = big ? 18 : 13;
  return (
    <div className="relative flex flex-col items-center">
      <span
        className="block rounded-full animate-breathe"
        style={{ width: size, height: size, backgroundColor: color, boxShadow: `0 0 24px 4px ${color}` }}
      />
      {label ? (
        <span className="mt-1 whitespace-nowrap text-[10px] font-medium text-ink/80">{label}</span>
      ) : null}
    </div>
  );
}
