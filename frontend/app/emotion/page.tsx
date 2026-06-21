"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { EmotionMap } from "@/components/EmotionMap";
import { SafetyBanner } from "@/components/SafetyBanner";
import { useVibeStore } from "@/lib/store";

const POLARITY: Record<string, string> = {
  positive: "偏积极",
  negative: "偏消极",
  neutral: "中性",
};

export default function EmotionPage() {
  const router = useRouter();
  const emotion = useVibeStore((state) => state.emotion);
  const [mode, setMode] = useState<"similar" | "complementary">("similar");

  if (!emotion) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <button
          className="panel rounded-full px-5 py-3 text-ink"
          onClick={() => router.push("/")}
        >
          先写下一段心情 →
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 pb-16 pt-28">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="grid gap-6 lg:grid-cols-[1fr_1.05fr]"
      >
        <section className="panel rounded-3xl p-7 shadow-panel">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-4xl"
              style={{ background: `${emotion.color}22`, boxShadow: `0 0 30px -6px ${emotion.color}` }}
            >
              {emotion.emotion_emoji}
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-faint">此刻你的情绪</div>
              <h1 className="font-display text-4xl text-ink">{emotion.primary_emotion}</h1>
            </div>
          </div>

          <p className="mt-5 text-[15px] leading-8 text-dim">{emotion.explanation}</p>

          <div className="mt-6 space-y-3">
            <Meter label="效价 valence" value={(emotion.valence + 1) / 2} hint={POLARITY[emotion.polarity]} color={emotion.color} />
            <Meter label="唤醒度 arousal" value={emotion.arousal} hint={emotion.arousal > 0.5 ? "高唤醒" : "低唤醒"} color={emotion.color} />
            <Meter label="强度 intensity" value={emotion.intensity} hint={`${Math.round(emotion.intensity * 100)}%`} color={emotion.color} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {emotion.keywords.map((keyword) => (
              <span key={keyword} className="panel rounded-full px-3 py-1 text-xs text-dim">
                #{keyword}
              </span>
            ))}
          </div>

          {emotion.degraded ? (
            <p className="mt-5 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              此刻先用了更稳的本地方式读你的情绪，不影响你继续往下走。
            </p>
          ) : null}
          {emotion.safety_flag ? <div className="mt-5"><SafetyBanner /></div> : null}
        </section>

        <section className="flex flex-col gap-4">
          <EmotionMap valence={emotion.valence} arousal={emotion.arousal} color={emotion.color} />

          <div className="panel rounded-3xl p-5">
            <div className="mb-3 text-sm text-dim">想遇见怎样的人？</div>
            <div className="grid grid-cols-2 gap-2">
              <ModeButton active={mode === "similar"} onClick={() => setMode("similar")} title="同频共振" desc="情绪相近的人" />
              <ModeButton active={mode === "complementary"} onClick={() => setMode("complementary")} title="互补陪伴" desc="情绪互补的人" />
            </div>
            <button
              onClick={() => router.push(`/matching?mode=${mode}`)}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-medium text-night-900 shadow-glow-sm transition hover:brightness-110"
              style={{ background: "var(--emotion)" }}
            >
              寻找同频的人
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </motion.div>
    </main>
  );
}

function Meter({ label, value, hint, color }: { label: string; value: number; hint: string; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-faint">{label}</span>
        <span className="text-dim">{hint}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left transition ${
        active ? "border-emotion bg-emotion/10" : "border-white/10 hover:border-white/20"
      }`}
    >
      <div className="text-sm font-medium text-ink">{title}</div>
      <div className="text-xs text-faint">{desc}</div>
    </button>
  );
}
