"use client";

import { useCardsContext } from "@/lib/CardsContext";

/**
 * Ming-variant current-work panel. Same logic as the ops version:
 * reads the In Progress column via the shared CardsContext, shows
 * the top card, with quiet idle coaching when nothing is active.
 */
export default function MingActiveCard() {
  const { columns, loading } = useCardsContext();

  const inProgress = columns.find(
    (c) => c.title.toLowerCase() === "in progress"
  );
  const today = columns.find((c) => c.title.toLowerCase() === "today");

  const active = inProgress?.cards[0];
  const extra = Math.max(0, (inProgress?.cards.length ?? 0) - 1);

  const labelStyle: React.CSSProperties = {
    fontFamily: "Futura, 'Trebuchet MS', sans-serif",
    fontSize: "0.68rem",
    letterSpacing: "0.4em",
    textTransform: "uppercase",
    color: "#c48a3c",
  };
  const titleStyle: React.CSSProperties = {
    fontFamily:
      "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
    fontSize: "1.5rem",
    color: "#e9dfce",
    fontStyle: "italic",
    textAlign: "center",
    maxWidth: 560,
    lineHeight: 1.3,
  };
  const metaStyle: React.CSSProperties = {
    fontFamily:
      "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
    fontSize: "0.78rem",
    fontStyle: "italic",
    color: "#5b5143",
    marginTop: "0.2rem",
  };

  if (loading && columns.length === 0) {
    return <div style={metaStyle}>Drawing from the cellar…</div>;
  }

  if (active) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        {active.label && <div style={labelStyle}>{active.label}</div>}
        <div style={titleStyle}>{active.title}</div>
        <div
          style={{
            ...metaStyle,
            display: "flex",
            alignItems: "center",
            gap: "0.9rem",
          }}
        >
          <span>№{active.number}</span>
          {extra > 0 && (
            <span
              style={{
                border: "1px solid #3a2f22",
                borderRadius: 999,
                padding: "0.15rem 0.55rem",
                color: "#9a8f7a",
                fontStyle: "normal",
                fontFamily: "Futura, 'Trebuchet MS', sans-serif",
                fontSize: "0.6rem",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              +{extra} also resting in hand
            </span>
          )}
        </div>
      </div>
    );
  }

  const todayCount = today?.cards.length ?? 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          ...labelStyle,
          color: "#5b5143",
        }}
      >
        Nothing in hand
      </div>
      <div
        style={{
          ...titleStyle,
          color: "#9a8f7a",
          fontSize: "1.1rem",
        }}
      >
        {todayCount > 0
          ? "Pour a card from Today into In Progress to begin."
          : "Today is empty — pour from Candidates, or draw from the briefing."}
      </div>
    </div>
  );
}
