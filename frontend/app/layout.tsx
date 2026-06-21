import type { Metadata } from "next";
import "./globals.css";
import { Starfield } from "@/components/Starfield";
import { EmotionTheme } from "@/components/EmotionTheme";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "VibeChat · 把情绪说出口，遇见同频的人",
  description: "AI 驱动的情绪社交：写下此刻心情，被理解、被匹配，进入匿名对话。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Noto+Serif+SC:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <Starfield />
        <EmotionTheme />
        <TopBar />
        {children}
      </body>
    </html>
  );
}
