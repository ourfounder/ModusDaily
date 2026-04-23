"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const STORAGE_KEY = "modusdaily:colWidths";
const DEFAULT_LEFT = 420;
const DEFAULT_RIGHT = 380;
const MIN_SIDE = 280;
const MAX_SIDE = 600;

export function useResizableColumns() {
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT);
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT);
  const dragging = useRef<"left" | "right" | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Restore from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { left, right } = JSON.parse(raw);
        if (left) setLeftWidth(clamp(left));
        if (right) setRightWidth(clamp(right));
      }
    } catch { /* ignore */ }
  }, []);

  const persist = useCallback((left: number, right: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, right }));
    } catch { /* ignore */ }
  }, []);

  const onPointerDown = useCallback(
    (side: "left" | "right", e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = side;
      startX.current = e.clientX;
      startWidth.current = side === "left" ? leftWidth : rightWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [leftWidth, rightWidth]
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      if (dragging.current === "left") {
        const next = clamp(startWidth.current + delta);
        setLeftWidth(next);
      } else {
        // Right column: dragging left increases width
        const next = clamp(startWidth.current - delta);
        setRightWidth(next);
      }
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Persist after drag ends — read current state
      setLeftWidth((l) => {
        setRightWidth((r) => {
          persist(l, r);
          return r;
        });
        return l;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [persist]);

  return {
    leftWidth,
    rightWidth,
    gridTemplateColumns: `${leftWidth}px 1fr ${rightWidth}px`,
    onPointerDown,
  };
}

function clamp(v: number): number {
  return Math.max(MIN_SIDE, Math.min(MAX_SIDE, Math.round(v)));
}
