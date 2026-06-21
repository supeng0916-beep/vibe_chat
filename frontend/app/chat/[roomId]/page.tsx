"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { EmotionMap } from "@/components/EmotionMap";
import { MessageBubble } from "@/components/MessageBubble";
import { SafetyBanner } from "@/components/SafetyBanner";
import { TypingIndicator } from "@/components/TypingIndicator";
import { api } from "@/lib/api";
import { useVibeStore } from "@/lib/store";
import type { ChatMessage, Member } from "@/lib/types";
import { createChatSocket, type ChatSocket } from "@/lib/ws";

export default function ChatPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const { session, emotion } = useVibeStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [icebreaking, setIcebreaking] = useState(false);
  const socketRef = useRef<ChatSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const roomId = params.roomId;
  const myId = session?.session_id;

  const partner = useMemo(
    () => members.find((m) => m.session_id !== myId) ?? null,
    [members, myId],
  );

  useEffect(() => {
    if (!session) {
      router.replace("/");
      return;
    }
    api.messages(roomId).then(setMessages).catch(() => setMessages([]));
    api.members(roomId).then(setMembers).catch(() => setMembers([]));

    const socket = createChatSocket(session.session_id, {
      onMessage: (message) =>
        setMessages((current) =>
          current.some((m) => m.id === message.id) ? current : [...current, message],
        ),
      onTyping: (who) => {
        if (who === session.session_id) return;
        setTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 1800);
      },
      onSystem: (event) => {
        if (event.event === "partner_joined" || event.event === "partner_left") {
          api.members(roomId).then(setMembers).catch(() => undefined);
        }
      },
    });
    socketRef.current = socket;
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      socket.close();
    };
  }, [roomId, router, session]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  function send(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content) return;
    socketRef.current?.sendMessage(roomId, content);
    setInput("");
  }

  function onType(value: string) {
    setInput(value);
    socketRef.current?.sendTyping(roomId);
  }

  async function addIcebreaker() {
    setIcebreaking(true);
    try {
      const result = await api.icebreaker(roomId);
      setInput(result.text);
    } catch {
      /* ignore */
    } finally {
      setIcebreaking(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-5 pt-24">
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* sidebar */}
        <aside className="hidden flex-col gap-4 lg:flex">
          <div className="panel rounded-3xl p-5">
            <div className="text-xs uppercase tracking-widest text-faint">你的匿名身份</div>
            <div className="mt-2 flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl"
                style={{ background: `${emotion?.color ?? "#8b5cf6"}22` }}
              >
                {session?.avatar ?? "🌙"}
              </div>
              <div className="font-display text-lg text-ink">{session?.nickname ?? "匿名用户"}</div>
            </div>
          </div>

          {emotion ? (
            <div className="panel rounded-3xl p-5">
              <div className="mb-3 text-sm text-dim">你们的情绪坐标</div>
              <EmotionMap
                valence={emotion.valence}
                arousal={emotion.arousal}
                color={emotion.color}
                variant="compact"
                partner={
                  partner && partner.valence !== null && partner.arousal !== null
                    ? { valence: partner.valence, arousal: partner.arousal, color: partner.color }
                    : null
                }
              />
            </div>
          ) : null}

          {emotion?.safety_flag ? <SafetyBanner /> : null}
        </aside>

        {/* chat panel */}
        <section className="panel flex h-[calc(100vh-7rem)] min-h-[520px] flex-col rounded-3xl">
          <header className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg"
                style={{ background: `${partner?.color ?? "#14b8a6"}22` }}
              >
                {partner?.emotion_emoji ?? partner?.avatar ?? "🫧"}
              </div>
              <div>
                <h1 className="font-display text-lg text-ink">{partner?.nickname ?? "同频匿名房间"}</h1>
                <p className="text-xs text-faint">
                  {partner?.primary_emotion ? `此刻情绪 · ${partner.primary_emotion}` : "匿名 · 情绪同频"}
                </p>
              </div>
            </div>
            <button
              onClick={addIcebreaker}
              disabled={icebreaking}
              className="panel inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-dim transition hover:text-ink disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {icebreaking ? "想词中…" : "帮我起个头"}
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-faint">
                <div className="mb-2 text-3xl">🫧</div>
                <p className="text-sm">这里只有你们俩，没人知道你是谁。</p>
                <p className="text-sm">先说一句此刻最想说的，或者让我帮你起个头。</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} mine={message.session_id === myId} />
                ))}
              </AnimatePresence>
            )}
            {typing ? <TypingIndicator label={`${partner?.nickname ?? "对方"} 正在输入`} /> : null}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-white/8 p-4">
            <input
              value={input}
              onChange={(event) => onType(event.target.value)}
              className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-ink outline-none transition focus:border-emotion"
              placeholder="匿名说点什么…"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="inline-flex h-12 items-center gap-2 rounded-2xl px-5 text-sm font-medium text-night-900 shadow-glow-sm transition hover:brightness-110 disabled:opacity-40"
              style={{ background: "var(--emotion)" }}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
