"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { EmotionMap } from "@/components/EmotionMap";
import { api } from "@/lib/api";
import { useVibeStore } from "@/lib/store";
import { createChatSocket, type ChatSocket } from "@/lib/ws";

const WAIT_BEFORE_FALLBACK = 12000;

function MatchingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode") ?? "similar";
  const { session, emotion, setRoomId } = useVibeStore();
  const [status, setStatus] = useState("正在情绪星图中寻找与你同频的人…");
  const [elapsed, setElapsed] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!session || !emotion) {
      router.replace("/");
      return;
    }
    const sessionId = session.session_id;
    let socket: ChatSocket | null = null;

    const go = (roomId: string) => {
      if (doneRef.current) return;
      doneRef.current = true;
      setRoomId(roomId);
      setStatus("找到了！正在连接…");
      router.push(`/chat/${roomId}`);
    };

    // Live push: someone may match us while we wait.
    socket = createChatSocket(sessionId, {
      onSystem: (event) => {
        if (event.event === "match_found" && event.room_id) go(event.room_id);
      },
    });

    api
      .match(sessionId, mode)
      .then((result) => {
        if (result.status === "matched" && result.room_id) go(result.room_id);
      })
      .catch(() => setStatus("匹配服务暂时不可用，请稍后重试。"));

    const ticker = window.setInterval(() => setElapsed((value) => value + 1), 1000);

    const poll = window.setInterval(async () => {
      if (doneRef.current) return;
      try {
        const current = await api.matchStatus(sessionId);
        if (current.status === "matched" && current.room_id) go(current.room_id);
      } catch {
        /* ignore transient errors */
      }
    }, 2500);

    const fallback = window.setTimeout(async () => {
      if (doneRef.current) return;
      setStatus("此刻没有完全同频的人在线，正在为你唤起一位同频陪伴…");
      try {
        const result = await api.matchFallback(sessionId, mode);
        if (result.room_id) go(result.room_id);
      } catch {
        setStatus("匹配服务暂时不可用，请稍后重试。");
      }
    }, WAIT_BEFORE_FALLBACK);

    return () => {
      window.clearInterval(ticker);
      window.clearInterval(poll);
      window.clearTimeout(fallback);
      socket?.close();
    };
  }, [session, emotion, mode, router, setRoomId]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-5 pb-16 pt-28">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full"
      >
        {emotion ? (
          <EmotionMap valence={emotion.valence} arousal={emotion.arousal} color={emotion.color} showCandidates />
        ) : null}

        <div className="mt-7 text-center">
          <div className="mb-3 flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-2 w-2 rounded-full bg-emotion"
                animate={{ opacity: [0.25, 1, 0.25], scale: [1, 1.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          <h1 className="font-display text-2xl text-ink">{status}</h1>
          <p className="mt-3 text-sm text-dim">
            匹配依据是效价与唤醒度的加权距离——这不是随机聊天室。
          </p>
          <p className="mt-1 text-xs text-faint">已等待 {elapsed}s · {mode === "complementary" ? "互补陪伴" : "同频共振"}模式</p>
        </div>
      </motion.div>
    </main>
  );
}

export default function MatchingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-dim">正在进入情绪星图…</main>
      }
    >
      <MatchingInner />
    </Suspense>
  );
}
