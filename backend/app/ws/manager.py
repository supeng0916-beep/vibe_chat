from __future__ import annotations

from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    """In-memory WebSocket connection manager.

    Single-process by design (see PROJECT_PLAN "轻量优先"). To scale across
    replicas, swap the body of `broadcast_room` for a Redis Pub/Sub publish and
    subscribe each process to the room channel — the call sites stay identical.
    """

    def __init__(self) -> None:
        self.session_connections: dict[str, WebSocket] = {}
        self.room_members: dict[str, set[str]] = defaultdict(set)

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.session_connections[session_id] = websocket

    def disconnect(self, session_id: str, websocket: WebSocket | None = None) -> bool:
        """Remove a session's connection.

        Returns False (a no-op) when `websocket` is not the session's *current*
        socket — this happens when a page navigation opens a new socket for the
        same session before the old page's socket finishes closing. Without this
        guard the stale socket's close would wipe the live connection and the
        user's room membership, silently breaking the chat.
        """
        current = self.session_connections.get(session_id)
        if websocket is not None and current is not websocket:
            return False
        self.session_connections.pop(session_id, None)
        for members in self.room_members.values():
            members.discard(session_id)
        return True

    def join_room(self, room_id: str, session_id: str) -> None:
        self.room_members[room_id].add(session_id)

    async def send_to_session(self, session_id: str, payload: dict) -> None:
        websocket = self.session_connections.get(session_id)
        if websocket:
            try:
                await websocket.send_json(payload)
            except Exception:
                self.disconnect(session_id, websocket)

    async def broadcast_room(self, room_id: str, payload: dict, exclude: str | None = None) -> None:
        for session_id in list(self.room_members[room_id]):
            if session_id == exclude:
                continue
            await self.send_to_session(session_id, payload)


manager = ConnectionManager()
