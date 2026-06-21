"use client";

import { motion } from "framer-motion";

export function TypingIndicator({ label = "对方正在输入" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 px-1 text-xs text-faint">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-emotion"
            animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </div>
      {label}
    </div>
  );
}
