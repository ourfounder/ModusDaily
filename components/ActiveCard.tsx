"use client";

import { useDroppable } from "@dnd-kit/core";
import { useCardsContext } from "@/lib/CardsContext";
import { useCardLabels } from "@/lib/useCardLabels";

/**
 * Active work display — the "Now" card.
 * Framed drop zone above the chronograph. This is the focal point.
 * Drop a card here to move it to In Progress.
 */
export default function ActiveCard() {
  const { columns, loading } = useCardsContext();
  const { setNodeRef, isOver } = useDroppable({ id: "active-work-drop" });
  const labels = useCardLabels();

  const inProgress = columns.find(
    (c) => c.title.toLowerCase() === "in progress"
  );
  const today = columns.find((c) => c.title.toLowerCase() === "today");

  const active = inProgress?.cards[0];
  const extra = Math.max(0, (inProgress?.cards.length ?? 0) - 1);
  const todayCount = today?.cards.length ?? 0;

  const frameStyle: React.CSSProperties = {
    textAlign: "center",
    padding: "0.8rem 2rem",
    borderRadius: 6,
    border: isOver
      ? "1.5px solid var(--accent)"
      : active
      ? "1.5px solid var(--accent-dim)"
      : "1.5px dashed var(--border)",
    background: isOver
      ? "rgba(196, 138, 60, 0.1)"
      : active
      ? "rgba(196, 138, 60, 0.04)"
      : "transparent",
    transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
    boxShadow: active ? "0 0 20px rgba(196, 138, 60, 0.06)" : "none",
    minWidth: "20rem",
  };

  if (loading && columns.length === 0) {
    return (
      <div ref={setNodeRef} style={frameStyle}>
        <div style={{
          fontFamily: '"Futura", "Trebuchet MS", sans-serif',
          fontSize: "0.55rem", letterSpacing: "0.35em", textTransform: "uppercase",
          color: "var(--ink-faint)",
        }}>
          Loading…
        </div>
      </div>
    );
  }

  if (active) {
    const displayLabel = labels.getLabel(active.number, active.label);
    return (
      <div ref={setNodeRef} style={frameStyle}>
        <div style={{
          fontFamily: '"Futura", "Trebuchet MS", sans-serif',
          fontSize: "0.55rem", letterSpacing: "0.3em", textTransform: "uppercase",
          color: "var(--accent)", marginBottom: "0.3rem",
        }}>
          {displayLabel ? `Now · ${displayLabel}` : "Now"}
        </div>
        <div style={{
          fontSize: "1.15rem", fontWeight: 300, color: "var(--ink)",
          lineHeight: 1.35, maxWidth: "28rem", margin: "0 auto",
        }}>
          {active.title}
        </div>
        {extra > 0 && (
          <div style={{
            marginTop: "0.25rem", fontSize: "0.5rem", color: "var(--ink-faint)",
            fontFamily: '"Futura", "Trebuchet MS", sans-serif',
            letterSpacing: "0.15em", textTransform: "uppercase",
          }}>
            +{extra} more in progress
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={frameStyle}>
      <div style={{
        fontFamily: '"Futura", "Trebuchet MS", sans-serif',
        fontSize: "0.55rem", letterSpacing: "0.3em", textTransform: "uppercase",
        color: isOver ? "var(--accent)" : "var(--ink-faint)",
        marginBottom: "0.15rem",
        transition: "color 0.15s",
      }}>
        Now
      </div>
      <div style={{
        fontSize: "0.8rem", fontWeight: 300, lineHeight: 1.4,
        color: isOver ? "var(--accent)" : "var(--ink-dim)",
      }}>
        {isOver
          ? "Drop to start working"
          : todayCount > 0
          ? "Drag a card here to begin"
          : "Add items from the briefing or run standup"}
      </div>
    </div>
  );
}
