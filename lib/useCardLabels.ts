"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Local card labels — project names that override KZ's useless "Enhancement" default.
 *
 * KZ's label field isn't reliably updatable via API, so we store
 * project assignments client-side in localStorage. These labels are
 * what show up on cards in the kanban and active work display.
 *
 * When a card has a local label, it takes precedence over KZ's label.
 * When a card has no local label and KZ's label is "Enhancement" (or empty),
 * we show nothing rather than a meaningless default.
 */

const STORAGE_KEY = "modusdaily:cardLabels";

type LabelMap = Record<number, string>;

export function useCardLabels() {
  const [map, setMap] = useState<LabelMap>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setMap(JSON.parse(raw));
      } else {
        // Seed with known project labels for existing cards
        const seed: LabelMap = {
          3175: "Five Sigma", 3176: "Selector",
          3177: "Selector", 3178: "Turner", 3179: "Selector", 3180: "Selector",
          3181: "Saasberry", 3182: "Selector", 3183: "Selector", 3184: "Selector",
          3185: "ACX", 3186: "ACX", 3187: "ACX", 3188: "Modus", 3189: "ACX", 3190: "ACX",
          3197: "Obeya", 3198: "Five Sigma",
        };
        setMap(seed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setLabel = useCallback((cardNumber: number, label: string) => {
    setMap((prev) => {
      const next = { ...prev, [cardNumber]: label };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /** Get the display label for a card. Returns local override, or KZ label if meaningful, or empty. */
  const getLabel = useCallback(
    (cardNumber: number, kzLabel?: string): string => {
      const local = map[cardNumber];
      if (local) return local;
      // "Enhancement" is KZ's generic default — treat as empty
      if (!kzLabel || kzLabel.toLowerCase() === "enhancement") return "";
      return kzLabel;
    },
    [map]
  );

  return { getLabel, setLabel, map };
}

/** Known project labels for autocomplete / suggestions */
export const PROJECT_LABELS = [
  "Selector",
  "Five Sigma",
  "ACX",
  "Modus",
  "Obeya",
  "Turner",
  "Saasberry",
  "PipBoy",
  "ModusDaily",
];
