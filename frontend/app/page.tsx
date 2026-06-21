"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useVibeStore } from "@/lib/store";

const EXAMPLES = [
  "今天面试前有点紧张，又有点期待，想找人聊聊。",
  "好累，感觉快撑不下去了，也没人懂我。",
  "刚收到好消息，开心到想分享给全世界！",
  "夜里睡不着，脑子里很吵，又说不清在烦什么。",
];

export default function HomePage() {
  const router = useRouter();
  const { session, setSession, setEmotion } = useVibeStore();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Wait for the persisted store to rehydrate before deciding to create a
  // session — otherwise a page reload spawns a fresh anonymous identity and
  // fragments the user's emotion history.
  useEffect(() => {
    setHydrated(useVibeStore.persist.hasHydrated());
    return useVibeStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated && !session) {
      api.createSession().then(setSession).catch(() => setError("创建匿名身份失败，请确认后端已启动。"));
    }
  }, [hydrated, session, setSession]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    let active = session;
    if (!active) {
      try {
        active = await api.createSession();
        setSession(active);
      } catch {
        setError("创建匿名身份失败，请确认后端已启动。");
        return;
      }
    }
    setLoading(true);
    setError("");
    try {
      const result = await api.analyzeEmotion(active.session_id, text.trim());
      setEmotion(result);
      router.push("/emotion");
    } catch {
      setError("情绪分析暂时不可用，请检查后端服务或 API Key。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-5 pb-20 pt-28 text-center">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="panel mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-emotion animate-breathe" />
          先被听见，再开始说
        </span>
        <h1 className="font-display text-4xl leading-[1.15] text-ink sm:text-6xl">
          此刻，<br className="sm:hidden" />
          <span style={{ color: "var(--emotion)" }}>你想被怎样理解？</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-dim sm:text-lg">
          把心里正在发生的事写下来。
          <br className="hidden sm:block" />
          我们会读懂它，帮你遇见此刻刚好同频的人。
        </p>
      </motion.div>

      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 w-full"
      >
        <div className="panel rounded-3xl p-2 shadow-panel">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-2xl bg-transparent p-4 text-left text-base leading-8 text-ink outline-none placeholder:text-faint"
            placeholder="比如：今天面试前有点紧张，也有一点期待，想找个人聊聊…"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-1">
            <span className="text-xs text-faint">{text.length} 字 · 写得越真，越容易遇见对的人</span>
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-night-900 shadow-glow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: "var(--emotion)" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {loading ? "正在读懂你…" : "读懂此刻的我"}
            </button>
          </div>
        </div>
      </motion.form>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      <div className="mt-7 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            onClick={() => setText(example)}
            className="panel rounded-full px-3 py-1.5 text-xs text-dim transition hover:text-ink"
          >
            {example.slice(0, 12)}…
          </button>
        ))}
      </div>
    </main>
  );
}
