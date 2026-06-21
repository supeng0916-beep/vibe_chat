"use client";

import { useEffect, useState } from "react";

type Star = { x: number; y: number; size: number; delay: number; dur: number; o: number };

function makeStars(count: number, maxSize: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 0.6 + Math.random() * maxSize,
      delay: Math.random() * 5,
      dur: 2.5 + Math.random() * 4,
      o: 0.25 + Math.random() * 0.6,
    });
  }
  return stars;
}

/**
 * Layered, twinkling starfield. Generated on the client (useEffect) so server
 * and client markup never disagree — no hydration mismatch from Math.random().
 */
export function Starfield() {
  const [layers, setLayers] = useState<Star[][]>([]);

  useEffect(() => {
    setLayers([makeStars(70, 1.1), makeStars(34, 1.8), makeStars(14, 2.6)]);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {layers.map((stars, li) =>
        stars.map((s, i) => (
          <span
            key={`${li}-${i}`}
            className="absolute rounded-full bg-white animate-twinkle"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              opacity: s.o,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.dur}s`,
              boxShadow: li === 2 ? "0 0 6px rgba(255,255,255,0.7)" : undefined,
            }}
          />
        )),
      )}
    </div>
  );
}
