"use client";

import { useCardsContext } from "@/lib/CardsContext";
import { usePriority } from "@/lib/usePriority";

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-inter), Inter, sans-serif",
  fontSize: "0.6rem",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--accent)",
};

const SECTION_RULE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
  marginBottom: "0.6rem",
};

const RULE_LINE: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: "var(--border)",
};

function CardRow({ title, label, priority }: { title: string; label?: string; priority?: "high" | "medium" | "low" }) {
  const badge = priority === "high" ? "H" : priority === "low" ? "L" : null;
  const priorityColor = priority === "high" ? "var(--work)" : "var(--ink-faint)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.5rem",
        padding: "0.4rem 0.6rem",
        borderRadius: 8,
        background: "var(--bg-card)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        marginBottom: "0.35rem",
      }}
    >
      {badge && (
        <span style={{ fontSize: "0.55rem", fontWeight: 700, color: priorityColor, marginTop: "0.1rem", minWidth: 10, fontFamily: "var(--font-inter), Inter, sans-serif" }}>
          {badge}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {label && (
          <div style={{ fontSize: "0.55rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.1rem", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
            {label}
          </div>
        )}
        <div style={{ fontSize: "0.82rem", color: "var(--ink)", lineHeight: 1.35, fontFamily: "var(--font-inter), Inter, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </div>
      </div>
    </div>
  );
}

export default function NowNextList() {
  const { columns } = useCardsContext();
  const { getPriority } = usePriority();

  // KZ column titles: "In Progress" = Now, "Today" = Next queue
  const nowCol = columns.find((c) => c.title === "In Progress");
  const todayCol = columns.find((c) => c.title === "Today");
  const nowCards = nowCol?.cards ?? [];
  const nextCards = (todayCol?.cards ?? []).slice(0, 4);

  return (
    <div style={{ padding: "0 1rem 1rem", display: "flex", flexDirection: "column" }}>
      {/* NOW */}
      <div style={SECTION_RULE}>
        <span style={LABEL_STYLE}>Now</span>
        <div style={RULE_LINE} />
      </div>
      {nowCards.length === 0 ? (
        <div style={{ fontSize: "0.78rem", color: "var(--ink-faint)", fontStyle: "italic", padding: "0.3rem 0.4rem", marginBottom: "0.8rem", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
          Drag a card here to begin
        </div>
      ) : (
        <div style={{ marginBottom: "0.8rem" }}>
          {nowCards.map((c) => <CardRow key={c.number} title={c.title} label={c.label} />)}
        </div>
      )}

      {/* NEXT */}
      <div style={SECTION_RULE}>
        <span style={LABEL_STYLE}>Next</span>
        <div style={RULE_LINE} />
      </div>
      {nextCards.length === 0 ? (
        <div style={{ fontSize: "0.78rem", color: "var(--ink-faint)", fontStyle: "italic", padding: "0.3rem 0.4rem", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
          Nothing queued for today
        </div>
      ) : (
        <div>
          {nextCards.map((c) => <CardRow key={c.number} title={c.title} label={c.label} priority={getPriority(c.number)} />)}
        </div>
      )}
    </div>
  );
}
