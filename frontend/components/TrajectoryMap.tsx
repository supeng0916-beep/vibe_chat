"use client";

import { motion } from "framer-motion";
import type { EmotionHistoryItem } from "@/lib/types";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const toX = (v: number) => clamp(50 + v * 42, 6, 94);
const toY = (a: number) => clamp(92 - a * 84, 6, 94);

/** Plots a session's emotion history as a path across the valence-arousal map. */
export function TrajectoryMap({ items }: { items: EmotionHistoryItem[] }) {
  const pts = items.map((it) => ({ x: toX(it.valence), y: toY(it.arousal), color: it.color, emoji: it.emotion_emoji }));
  const path = pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="panel va-grid relative h-[24rem] w-full overflow-hidden rounded-2xl">
      <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
      <div className="absolute top-1/2 h-px w-full bg-white/10" />
      <div className="absolute left-3 top-3 text-[11px] font-medium text-violet-300/70">焦虑风暴 ⚡</div>
      <div className="absolute right-3 top-3 text-right text-[11px] font-medium text-orange-300/70">兴奋广场 🔆</div>
      <div className="absolute bottom-3 left-3 text-[11px] font-medium text-sky-300/70">低落深海 🌊</div>
      <div className="absolute bottom-3 right-3 text-right text-[11px] font-medium text-teal-300/70">平静海湾 🌙</div>

      {pts.length > 1 && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <motion.polyline
            points={path}
            fill="none"
            stroke="var(--emotion)"
            strokeWidth={0.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="0 1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.6 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          />
        </svg>
      )}

      {pts.map((p, i) => {
        const latest = i === pts.length - 1;
        return (
          <motion.div
            key={items[i].id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 * i, type: "spring", stiffness: 200, damping: 16 }}
          >
            <span
              className={`block rounded-full ${latest ? "animate-breathe" : ""}`}
              style={{
                width: latest ? 16 : 9,
                height: latest ? 16 : 9,
                background: p.color,
                boxShadow: `0 0 ${latest ? 22 : 10}px ${latest ? 4 : 1}px ${p.color}`,
                opacity: latest ? 1 : 0.45 + (0.5 * i) / Math.max(1, pts.length - 1),
              }}
            />
            {latest ? (
              <span className="mt-1 block whitespace-nowrap text-center text-[10px] text-ink/80">现在</span>
            ) : null}
          </motion.div>
        );
      })}
    </div>
  );
}
