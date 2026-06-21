"use client";

import { motion } from "framer-motion";
import type { ChatMessage } from "@/lib/types";

export function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const isAI = message.session_id === "ai-companion";
  const time = new Date(message.created_at).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={`flex ${mine ? "justify-end" : "justify-start"}`}
    >
      <div className={`flex max-w-[80%] flex-col ${mine ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-[15px] leading-7 ${
            mine
              ? "rounded-br-md text-night-900"
              : isAI
                ? "rounded-bl-md border border-teal-300/20 bg-teal-300/10 text-ink"
                : "panel rounded-bl-md text-ink"
          }`}
          style={mine ? { background: "var(--emotion)" } : undefined}
        >
          {message.content}
        </div>
        <div className="mt-1 px-1 text-[11px] text-faint">
          {isAI ? "🫧 同频陪伴" : mine ? "你" : "匿名同频者"} · {time}
        </div>
      </div>
    </motion.div>
  );
}
