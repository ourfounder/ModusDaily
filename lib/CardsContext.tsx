"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useCards, type CardsState } from "./useCards";

/**
 * Page-wide cards store.
 *
 * Wraps a single `useCards()` instance so the kanban rail, the center
 * "current work" panel, and anything else in the tree share one copy
 * of the KZ state. Without this, an optimistic drag in the rail would
 * not be visible to the center panel until its own refresh fired.
 */
const Ctx = createContext<CardsState | null>(null);

export function CardsProvider({ children }: { children: ReactNode }) {
  const state = useCards();
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useCardsContext(): CardsState {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error(
      "useCardsContext must be used inside <CardsProvider> — wrap the page."
    );
  }
  return v;
}
