"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { EmotionResult, SessionInfo } from "./types";

type VibeState = {
  session?: SessionInfo;
  emotion?: EmotionResult;
  roomId?: string;
  setSession: (session: SessionInfo) => void;
  setEmotion: (emotion: EmotionResult) => void;
  setRoomId: (roomId: string) => void;
  reset: () => void;
};

/** Persisted so a page refresh never drops the user out of the flow (demo robustness). */
export const useVibeStore = create<VibeState>()(
  persist(
    (set) => ({
      setSession: (session) => set({ session }),
      setEmotion: (emotion) => set({ emotion }),
      setRoomId: (roomId) => set({ roomId }),
      reset: () => set({ emotion: undefined, roomId: undefined }),
    }),
    {
      name: "vibechat",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ session: s.session, emotion: s.emotion, roomId: s.roomId }),
    },
  ),
);
