"use client";

import { useCallback, useState } from "react";
import { useCardsContext } from "@/lib/CardsContext";

/**
 * Create a card on the KZ board via the populate endpoint (single-intent manifest).
 * Gets dedup for free — won't create if same title+label already exists.
 * Refreshes the shared CardsContext after creation.
 */
export function useCreateCard() {
  const [creating, setCreating] = useState(false);
  const { refresh } = useCardsContext();

  const createCard = useCallback(
    async (title: string, column = "Today", label = "") => {
      if (!title.trim()) return null;
      setCreating(true);
      try {
        const res = await fetch("/api/kz/populate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intents: [
              {
                title: title.trim(),
                columnTitle: column,
                label: label.trim(),
                source: "manual",
              },
            ],
          }),
        });
        const data = await res.json();
        await refresh();
        return data;
      } catch (e) {
        console.error("createCard failed:", e);
        return null;
      } finally {
        setCreating(false);
      }
    },
    [refresh]
  );

  return { createCard, creating };
}
