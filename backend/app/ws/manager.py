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

    def disconnect(self, session_id: str) -> None:
        self.session_connections.pop(session_id, None)
        for members in self.room_members.values():
            members.discard(session_id)

    def join_room(self, room_id: str, session_id: str) -> None:
        self.room_members[room_id].add(session_id)

    async def send_to_session(self, session_id: str, payload: dict) -> None:
        websocket = self.session_connections.get(session_id)
        if websocket:
            try:
                await websocket.send_json(payload)
            except Exception:
                self.disconnect(session_id)

    async def broadcast_room(self, room_id: str, payload: dict, exclude: str | None = None) -> None:
        for session_id in list(self.room_members[room_id]):
            if session_id == exclude:
                continue
            await self.send_to_session(session_id, payload)


manager = ConnectionManager()
