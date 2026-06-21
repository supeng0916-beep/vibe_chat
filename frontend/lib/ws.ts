import type { ChatMessage, SystemEvent } from "./types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export type ChatHandlers = {
  onMessage?: (m: ChatMessage) => void;
  onSystem?: (e: SystemEvent) => void;
  onTyping?: (sessionId: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export type ChatSocket = {
  send: (data: object) => void;
  sendMessage: (roomId: string, content: string) => void;
  sendTyping: (roomId: string) => void;
  close: () => void;
};

/** Reconnecting chat socket. Survives Render free-tier sleeps / proxy drops. */
export function createChatSocket(sessionId: string, handlers: ChatHandlers): ChatSocket {
  let socket: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    socket = new WebSocket(`${WS_URL}/ws/${sessionId}`);
    socket.onopen = () => {
      retry = 0;
      handlers.onOpen?.();
    };
    socket.onmessage = (ev) => {
      let payload: { type?: string; message?: ChatMessage; session_id?: string };
      try {
        payload = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (payload.type === "message" && payload.message) handlers.onMessage?.(payload.message);
      else if (payload.type === "typing" && payload.session_id) handlers.onTyping?.(payload.session_id);
      else if (payload.type === "system") handlers.onSystem?.(payload as unknown as SystemEvent);
    };
    socket.onclose = () => {
      handlers.onClose?.();
      if (closed) return;
      retry += 1;
      const delay = Math.min(1000 * 2 ** retry, 8000);
      reconnectTimer = setTimeout(connect, delay);
    };
    socket.onerror = () => socket?.close();
  };
  connect();

  const send = (data: object) => {
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data));
  };

  return {
    send,
    sendMessage: (roomId, content) => send({ type: "message", room_id: roomId, content }),
    sendTyping: (roomId) => send({ type: "typing", room_id: roomId }),
    close: () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
}
