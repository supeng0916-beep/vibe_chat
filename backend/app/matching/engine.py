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

    def find_match(
        self,
        session_id: str,
        emotion: EmotionResult,
        threshold: float | None = None,
        mode: str = "similar",
    ) -> MatchResult | None:
        candidates = [item for item in self._queue if item.session_id != session_id]
        if not candidates:
            return None

        def score(item: WaitingUser) -> float:
            if mode == "complementary":
                # Complementarity is mainly about opposite valence; differing
                # arousal is expected, so weight the arousal gap much lighter.
                return self._weighted(emotion.valence + item.emotion.valence, (emotion.arousal - item.emotion.arousal) * 0.4)
            return self.distance(emotion, item.emotion)

        best = min(candidates, key=score)
        if score(best) > (threshold if threshold is not None else self.strict_threshold):
            return None

        self._queue = [item for item in self._queue if item.session_id != best.session_id]
        return MatchResult(partner=best, distance=self.distance(emotion, best.emotion))

    def _weighted(self, dv: float, da: float) -> float:
        return sqrt(self.valence_weight * dv**2 + self.arousal_weight * da**2)

    def distance(self, left: EmotionResult, right: EmotionResult) -> float:
        return self._weighted(left.valence - right.valence, left.arousal - right.arousal)
