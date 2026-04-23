"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Collapsible section with localStorage persistence.
 * Ming-styled: warm umber background, brass accents, Futura labels.
 */
export default function CollapsibleSection({
  id,
  title,
  badge,
  defaultOpen = true,
  accentColor,
  action,
  children,
}: {
  id: string;
  title: string;
  badge?: string | number;
  defaultOpen?: boolean;
  accentColor?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const key = `modusdaily:section:${id}`;
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored !== null) setOpen(stored === "1");
  }, [key]);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem(key, next ? "1" : "0");
      return next;
    });
  }, [key]);

  return (
    <section
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={toggle}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.6rem 0.9rem",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--bg-card-hover)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "transparent")
        }
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span
            style={{
              fontSize: "0.6rem",
              transition: "transform 0.15s",
              transform: open ? "rotate(90deg)" : "rotate(0)",
              color: "var(--ink-faint)",
            }}
          >
            ▶
          </span>
          <span
            style={{
              fontFamily: '"Futura", "Trebuchet MS", sans-serif',
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: accentColor ?? "var(--accent)",
            }}
          >
            {title}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {action}
          {badge !== undefined && (
            <span
              style={{
                background: "var(--border)",
                borderRadius: 999,
                padding: "0.15rem 0.5rem",
                fontSize: "0.6rem",
                color: "var(--ink-dim)",
              }}
            >
              {badge}
            </span>
          )}
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 0.9rem 0.75rem" }}>{children}</div>
      )}
    </section>
  );
}
