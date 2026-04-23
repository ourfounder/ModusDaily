"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * "Waiting" shelf — cards where the ball is in someone else's court.
 *
 * This is a UI-only overlay. The card stays in its KZ column (Today, etc.)
 * but gets visually pulled into the Waiting strip at the bottom of the screen.
 * Stored in localStorage as a set of card numbers.
 */

const STORAGE_KEY = "modusdaily:waiting";

export function useWaiting() {
  const [waitingSet, setWaitingSet] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setWaitingSet(new Set(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: Set<number>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  };

  const addToWaiting = useCallback((cardNumber: number) => {
    setWaitingSet((prev) => {
      const next = new Set(prev);
      next.add(cardNumber);
      persist(next);
      return next;
    });
  }, []);

  const removeFromWaiting = useCallback((cardNumber: number) => {
    setWaitingSet((prev) => {
      const next = new Set(prev);
      next.delete(cardNumber);
      persist(next);
      return next;
    });
  }, []);

  const isWaiting = useCallback(
    (cardNumber: number) => waitingSet.has(cardNumber),
    [waitingSet]
  );

  return { waitingSet, addToWaiting, removeFromWaiting, isWaiting };
}
