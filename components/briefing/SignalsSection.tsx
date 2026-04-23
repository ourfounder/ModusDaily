"use client";

import { useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import { useCreateCard } from "@/lib/useCreateCard";
import type { ClientSignal } from "@/lib/briefing/parseFullBriefing";

const urgencyColors: Record<string, { dot: string; action: string; border: string }> = {
  urgent: { dot: "#c45a3c", action: "#d4806a", border: "rgba(196, 90, 60, 0.3)" },
  waiting: { dot: "#9a7ac4", action: "#b89ad4", border: "rgba(154, 122, 196, 0.3)" },
  info: { dot: "var(--accent)", action: "var(--accent)", border: "var(--accent-dim)" },
  default: { dot: "var(--accent)", action: "var(--accent)", border: "var(--accent-dim)" },
};

export default function SignalsSection({ signals }: { signals: ClientSignal[] }) {
  return (
    <CollapsibleSection
      id="signals"
      title="Client Signals"
      badge={signals.length}
      accentColor="#c45a3c"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {signals.map((s, i) => (
          <SignalRow key={i} signal={s} />
        ))}
      </div>
    </CollapsibleSection>
  );
}

function SignalRow({ signal }: { signal: ClientSignal }) {
  const colors = urgencyColors[signal.urgency] ?? urgencyColors.default;
  const { createCard, creating } = useCreateCard();
  const [sent, setSent] = useState(false);

  const sendToBoard = async () => {
    // Use the action text as title if available, otherwise signal title
    const title = signal.action || signal.title;
    const label = signal.badge || "";
    await createCard(title, "Today", label);
    setSent(true);
  };

  return (
    <div
      style={{
        borderRadius: 3,
        border: `1px solid ${colors.border}`,
        background: "var(--bg-card)",
        padding: "0.6rem 0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
        <div
          style={{
            marginTop: "0.35rem",
            height: 6,
            width: 6,
            flexShrink: 0,
            borderRadius: "50%",
            background: colors.dot,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink)" }}>
            {signal.title}
            {signal.badge && (
              <span
                style={{
                  marginLeft: "0.5rem",
                  background: "var(--border)",
                  borderRadius: 2,
                  padding: "0.1rem 0.35rem",
                  fontSize: "0.55rem",
                  fontWeight: 400,
                  color: "var(--ink-dim)",
                }}
              >
                {signal.badge}
              </span>
            )}
          </div>
          <div style={{ marginTop: "0.2rem", fontSize: "0.7rem", lineHeight: 1.5, color: "var(--ink-dim)" }}>
            {signal.detail}
          </div>
          {signal.action && (
            <div style={{ marginTop: "0.3rem", fontSize: "0.7rem", fontWeight: 500, color: colors.action }}>
              {signal.action}
            </div>
          )}
        </div>
        {/* → Today button */}
        {!sent ? (
          <button
            type="button"
            onClick={sendToBoard}
            disabled={creating}
            title="Send to Today column"
            style={{
              flexShrink: 0,
              marginTop: "0.15rem",
              background: "transparent",
              border: "1px solid var(--accent-dim)",
              borderRadius: 3,
              padding: "0.15rem 0.4rem",
              fontFamily: '"Futura", "Trebuchet MS", sans-serif',
              fontSize: "0.5rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--accent)",
              cursor: creating ? "wait" : "pointer",
              opacity: creating ? 0.5 : 1,
              transition: "background 0.15s, color 0.15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--accent-dim)";
              e.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--accent)";
            }}
          >
            → Today
          </button>
        ) : (
          <span
            style={{
              flexShrink: 0,
              marginTop: "0.15rem",
              fontSize: "0.5rem",
              color: "var(--short-break)",
              fontFamily: '"Futura", "Trebuchet MS", sans-serif',
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            ✓ Sent
          </span>
        )}
      </div>
    </div>
  );
}
