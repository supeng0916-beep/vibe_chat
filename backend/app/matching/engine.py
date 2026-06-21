from __future__ import annotations

from math import sqrt

from app.schemas import EmotionResult, MatchResult, WaitingUser


class MatchingEngine:
    def __init__(self, strict_threshold: float = 0.35, valence_weight: float = 1.0, arousal_weight: float = 0.7) -> None:
        self.strict_threshold = strict_threshold
        self.valence_weight = valence_weight
        self.arousal_weight = arousal_weight
        self._queue: list[WaitingUser] = []

    def enqueue(self, user: WaitingUser) -> None:
        self._queue = [item for item in self._queue if item.session_id != user.session_id]
        self._queue.append(user)

    def remove(self, session_id: str) -> None:
        self._queue = [item for item in self._queue if item.session_id != session_id]

    def find_match(self, session_id: str, emotion: EmotionResult, threshold: float | None = None) -> MatchResult | None:
        candidates = [item for item in self._queue if item.session_id != session_id]
        if not candidates:
            return None

        best = min(candidates, key=lambda item: self.distance(emotion, item.emotion))
        best_distance = self.distance(emotion, best.emotion)
        if best_distance > (threshold if threshold is not None else self.strict_threshold):
            return None

        self._queue = [item for item in self._queue if item.session_id != best.session_id]
        return MatchResult(partner=best, distance=best_distance)

    def distance(self, left: EmotionResult, right: EmotionResult) -> float:
        return sqrt(
            self.valence_weight * (left.valence - right.valence) ** 2
            + self.arousal_weight * (left.arousal - right.arousal) ** 2
        )
