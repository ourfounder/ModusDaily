"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * "Notes to Pip" — freeform textarea that persists to localStorage.
 *
 * These notes surface during morning standup via /pip-standup.
 * They're things Jim wants to remember to discuss with Pip
 * that don't fit neatly into a card or briefing item.
 */
export default function NotesToPip() {
  const STORAGE_KEY = "modusdaily:notesToPip";
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setText(raw);
    } catch {
      /* ignore */
    }
  }, []);

  const save = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, text);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [text]);

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        padding: "0.75rem 1rem",
      }}
    >
      <div
        style={{
          fontFamily: '"Futura", "Trebuchet MS", sans-serif',
          letterSpacing: "0.2em",
          textTransform: "uppercase" as const,
          color: "var(--accent)",
          fontSize: "0.65rem",
          marginBottom: "0.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Notes to Pip</span>
        {saved && (
          <span style={{ color: "var(--short-break)", fontSize: "0.6rem" }}>
            Saved
          </span>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        placeholder="Things to discuss with Pip tomorrow morning..."
        rows={4}
        style={{
          width: "100%",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: 3,
          padding: "0.5rem",
          color: "var(--ink)",
          fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
          fontSize: "0.8rem",
          lineHeight: 1.5,
          resize: "vertical",
          outline: "none",
        }}
      />
    </div>
  );
}
