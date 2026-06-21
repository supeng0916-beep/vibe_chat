"use client";

import { useEffect } from "react";
import { useVibeStore } from "@/lib/store";

function hexToSoft(hex: string, alpha = 0.18): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return `rgba(139,92,246,${alpha})`;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Bridges the current emotion color into the global --emotion CSS variable,
 *  so the whole nightscape glows with how the user feels. */
export function EmotionTheme() {
  const color = useVibeStore((s) => s.emotion?.color);

  useEffect(() => {
    const root = document.documentElement;
    const c = color || "#8b5cf6";
    root.style.setProperty("--emotion", c);
    root.style.setProperty("--emotion-soft", hexToSoft(c, 0.2));
  }, [color]);

  return null;
}
