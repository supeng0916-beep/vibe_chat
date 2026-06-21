export type EmotionResult = {
  reasoning: string;
  primary_emotion: string;
  secondary_emotions: string[];
  valence: number;
  arousal: number;
  intensity: number;
  polarity: "positive" | "negative" | "neutral";
  keywords: string[];
  color: string;
  emotion_emoji: string;
  explanation: string;
  safety_flag: boolean;
  degraded: boolean;
  emotion_profile_id?: string;
};

export type SessionInfo = {
  session_id: string;
  nickname: string;
  avatar: string;
  theme_color: string;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  session_id: string;
  content: string;
  created_at: string;
};

export type Member = {
  session_id: string;
  nickname: string;
  avatar: string;
  primary_emotion: string | null;
  emotion_emoji: string | null;
  color: string;
  valence: number | null;
  arousal: number | null;
};

export type SystemEvent = {
  type: "system";
  event: "match_found" | "partner_joined" | "partner_left";
  room_id?: string;
  session_id?: string;
  distance?: number;
};

export type EmotionHistoryItem = {
  id: string;
  valence: number;
  arousal: number;
  intensity: number;
  primary_emotion: string;
  color: string;
  emotion_emoji: string;
  raw_text: string;
  explanation: string;
  created_at: string;
};
