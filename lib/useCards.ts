"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type KzCardLite = {
  number: number;
  title: string;
  label?: string;
  columnId: string;
  columnTitle: string;
  blocked?: boolean;
  description?: string;
};

export type KzColumnLite = {
  title: string;
  columnId: string | null;
  cards: KzCardLite[];
};

export type CardsState = {
  columns: KzColumnLite[];
  loading: boolean;
  error: string | null;
  /** Optimistically move a card in local state; caller handles server POST. */
  moveCardLocal: (cardNumber: number, toColumnTitle: string) => void;
  /** Re-fetch from KZ (call after a server move succeeds). */
  refresh: () => Promise<void>;
  /** Call the move endpoint and update local state. Rolls back on failure. */
  moveCard: (cardNumber: number, toColumnTitle: string) => Promise<void>;
};

type Snapshot = { columns: KzColumnLite[] };

/**
 * Live card store for the kanban rails.
 *
 * Both `/` and `/ming` variants consume this. Fetches once on mount,
 * supports optimistic local moves, and POSTs to /api/kz/cards/[n]/move
 * on user-driven moves. On failure it rolls back.
 *
 * NOTE: this is a per-mount hook for now — two rails on the same page
 * each keep their own state, but they both refresh from the same source.
 * If cross-variant sync becomes a real problem, lift to a Zustand store
 * or React Context. For the current 4K-single-tab workflow, per-mount
 * is fine.
 */
export function useCards(): CardsState {
  const [columns, setColumns] = useState<KzColumnLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevSnapshot = useRef<Snapshot | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kz/cards", { cache: "no-store" });
      if (!res.ok) throw new Error(`GET /api/kz/cards ${res.status}`);
      const data = (await res.json()) as {
        columns: KzColumnLite[];
        error?: string;
      };
      if (data.error) throw new Error(data.error);
      setColumns(data.columns ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const moveCardLocal = useCallback(
    (cardNumber: number, toColumnTitle: string) => {
      setColumns((cols) => {
        let moved: KzCardLite | null = null;
        const stripped = cols.map((col) => {
          const next = col.cards.filter((c) => {
            if (c.number === cardNumber) {
              moved = c;
              return false;
            }
            return true;
          });
          return { ...col, cards: next };
        });
        if (!moved) return cols;
        return stripped.map((col) => {
          if (col.title.toLowerCase() !== toColumnTitle.toLowerCase()) return col;
          const updated: KzCardLite = {
            ...moved!,
            columnTitle: col.title,
            columnId: col.columnId ?? moved!.columnId,
          };
          return { ...col, cards: [updated, ...col.cards] };
        });
      });
    },
    []
  );

  const moveCard = useCallback(
    async (cardNumber: number, toColumnTitle: string) => {
      prevSnapshot.current = { columns };
      moveCardLocal(cardNumber, toColumnTitle);
      try {
        const res = await fetch(`/api/kz/cards/${cardNumber}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toColumnTitle }),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`move ${cardNumber} → ${toColumnTitle}: ${body}`);
        }
      } catch (e) {
        // Roll back.
        if (prevSnapshot.current) setColumns(prevSnapshot.current.columns);
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        prevSnapshot.current = null;
      }
    },
    [columns, moveCardLocal]
  );

  return { columns, loading, error, moveCardLocal, refresh, moveCard };
}
