"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, PenLine } from "lucide-react";
import { TrajectoryMap } from "@/components/TrajectoryMap";
import { useVibeStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { EmotionHistoryItem } from "@/lib/types";

export default function HistoryPage() {
  const router = useRouter();
  const session = useVibeStore((s) => s.session);
  const [items, setItems] = useState<EmotionHistoryItem[] | null>(null);

  useEffect(() => {
    if (!session) return;
    api.history(session.session_id).then(setItems).catch(() => setItems([]));
  }, [session]);

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <button className="panel rounded-full px-5 py-3 text-ink" onClick={() => router.push("/")}>
          先写下一段心情 →
        </button>
      </main>
    );
  }

  const empty = items !== null && items.length === 0;

  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-28">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="mb-2 flex items-end justify-between">
          <h1 className="font-display text-3xl text-ink">情绪轨迹</h1>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-dim transition hover:text-ink">
            <PenLine className="h-4 w-4" /> 再记一次此刻
          </Link>
        </div>
        <p className="mb-6 text-sm text-dim">你每一次写下的心情，都会留在这片星图里，连成你的情绪走向。</p>

        {items === null ? (
          <div className="panel h-[24rem] animate-pulse rounded-2xl" />
        ) : empty ? (
          <div className="panel flex h-[24rem] flex-col items-center justify-center rounded-2xl text-center text-faint">
            <div className="mb-3 text-3xl">🌌</div>
            <p className="text-sm">这里还很空。</p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-night-900"
              style={{ background: "var(--emotion)" }}
            >
              写下第一段心情 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            <TrajectoryMap items={items} />
            <div className="mt-6 space-y-3">
              {[...items].reverse().map((it) => (
                <div key={it.id} className="panel flex items-start gap-3 rounded-2xl p-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                    style={{ background: `${it.color}22` }}
                  >
                    {it.emotion_emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink">{it.primary_emotion}</span>
                      <span className="text-xs text-faint">{formatTime(it.created_at)}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-dim">{it.raw_text}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </main>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
