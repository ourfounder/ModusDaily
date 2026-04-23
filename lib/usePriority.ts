"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Card priority: High / Medium / Low.
 *
 * Stored in localStorage keyed by card number.
 * Default is "medium" for any card without explicit priority.
 * Priority persists across sessions — it's a Jim decision, not ephemeral.
 */

export type Priority = "high" | "medium" | "low";

const STORAGE_KEY = "modusdaily:priorities";

type PriorityMap = Record<number, Priority>;

export function usePriority() {
  const [map, setMap] = useState<PriorityMap>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMap(JSON.parse(raw));
    } catch {
      /* ignore corrupt */
    }
  }, []);

  const setPriority = useCallback((cardNumber: number, priority: Priority) => {
    setMap((prev) => {
      const next = { ...prev, [cardNumber]: priority };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getPriority = useCallback(
    (cardNumber: number): Priority => map[cardNumber] ?? "medium",
    [map]
  );

  const cyclePriority = useCallback(
    (cardNumber: number) => {
      const current = map[cardNumber] ?? "medium";
      const next: Priority =
        current === "high" ? "medium" : current === "medium" ? "low" : "high";
      setPriority(cardNumber, next);
    },
    [map, setPriority]
  );

  return { getPriority, setPriority, cyclePriority, map };
}
