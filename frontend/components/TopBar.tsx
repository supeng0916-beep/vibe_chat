"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

/** Top brand bar with a live provider badge — surfaces the OpenAI/Anthropic
 *  dual-standard adapter to judges at a glance. */
export function TopBar() {
  const [provider, setProvider] = useState<{ provider: string; model: string } | null>(null);

  useEffect(() => {
    api.config().then(setProvider).catch(() => setProvider(null));
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-4 sm:px-8">
      <Link href="/" className="group flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-emotion shadow-glow-sm animate-breathe" />
        <span className="font-display text-lg tracking-wide text-ink">VibeChat</span>
      </Link>
      {provider ? (
        <div className="panel flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {provider.provider === "anthropic" ? "Anthropic" : "OpenAI"} 标准 · {provider.model}
        </div>
      ) : null}
    </header>
  );
}
