import type { ChatMessage, EmotionHistoryItem, EmotionResult, Member, SessionInfo } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

type MatchResponse = {
  status: "matched" | "waiting";
  room_id?: string;
  distance?: number;
  fallback?: string;
};

export const api = {
  createSession: () => request<SessionInfo>("/api/session", { method: "POST" }),
  analyzeEmotion: (sessionId: string, text: string) =>
    request<EmotionResult>("/api/emotion/analyze", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, text }),
    }),
  match: (sessionId: string, mode = "similar") =>
    request<MatchResponse>("/api/match", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, mode }),
    }),
  matchFallback: (sessionId: string, mode = "similar") =>
    request<MatchResponse>("/api/match/fallback", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, mode }),
    }),
  matchStatus: (sessionId: string) =>
    request<MatchResponse>(`/api/match/status?session_id=${encodeURIComponent(sessionId)}`),
  messages: (roomId: string) => request<ChatMessage[]>(`/api/rooms/${roomId}/messages`),
  members: (roomId: string) => request<Member[]>(`/api/rooms/${roomId}/members`),
  icebreaker: (roomId: string) =>
    request<{ text: string }>("/api/conversation/icebreaker", {
      method: "POST",
      body: JSON.stringify({ room_id: roomId }),
    }),
  config: () => request<{ provider: string; model: string }>("/api/config"),
  history: (sessionId: string) =>
    request<EmotionHistoryItem[]>(`/api/emotion/history?session_id=${encodeURIComponent(sessionId)}`),
};
