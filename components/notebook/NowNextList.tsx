"use client";

import { useCardsContext } from "@/lib/CardsContext";
import { useWalkLog } from "@/lib/useWalkLog";
import { usePomodoro } from "@/lib/usePomodoro";
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
        padding: "0.45rem 0.6rem",
        borderRadius: 8,
        background: "var(--bg-card)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        marginBottom: "0.4rem",
      }}
    >
      {badge && (
        <span
          style={{
            fontSize: "0.55rem",
            fontWeight: 700,
            color: priorityColor,
            marginTop: "0.1rem",
            minWidth: 10,
            fontFamily: "var(--font-inter), Inter, sans-serif",
          }}
        >
          {badge}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {label && (
          <div
            style={{
              fontSize: "0.55rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: "0.15rem",
              fontFamily: "var(--font-inter), Inter, sans-serif",
            }}
          >
            {label}
          </div>
        )}
        <div
          style={{
            fontSize: "0.82rem",
            color: "var(--ink)",
            lineHeight: 1.35,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
      </div>
    </div>
  );
}

export default function NowNextList({ onOpenKanban }: { onOpenKanban: () => void }) {
  const { columns } = useCardsContext();
  const { walkedCount, totalBreaks } = useWalkLog();
  const { completed } = usePomodoro();
  const { getPriority } = usePriority();

  const nowCol = columns.find((c) => c.title === "In Progress");
  const todayCol = columns.find((c) => c.title === "To Do Today");
  const nowCards = nowCol?.cards ?? [];
  const nextCards = (todayCol?.cards ?? []).slice(0, 3);

  return (
    <div style={{ padding: "0 1.2rem 1.2rem", display: "flex", flexDirection: "column", gap: "0" }}>

      {/* Performance strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.2rem",
          padding: "0.6rem 0.8rem",
          borderRadius: 10,
          background: "var(--bg-card)",
          boxShadow: "0 1px 4px rgba(10,102,64,0.06)",
          marginBottom: "1rem",
          fontFamily: "var(--font-inter), Inter, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>
            {completed}
          </div>
          <div style={{ fontSize: "0.58rem", color: "var(--ink-faint)", marginTop: "0.2rem", letterSpacing: "0.06em" }}>
            pomos
          </div>
        </div>
        <div style={{ width: 1, height: 28, background: "var(--border)" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.3rem", fontWeight: 600, color: walkedCount > 0 ? "var(--work)" : "var(--ink)", lineHeight: 1 }}>
            {walkedCount}<span style={{ fontSize: "0.8rem", color: "var(--ink-faint)" }}>/{totalBreaks}</span>
          </div>
          <div style={{ fontSize: "0.58rem", color: "var(--ink-faint)", marginTop: "0.2rem", letterSpacing: "0.06em" }}>
            walks
          </div>
        </div>
        {totalBreaks > 0 && (
          <div style={{ display: "flex", gap: "0.25rem", alignItems: "center", marginLeft: "auto" }}>
            {Array.from({ length: totalBreaks }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: i < walkedCount ? "var(--work)" : "var(--border)",
                  display: "inline-block",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* NOW */}
      <div style={SECTION_RULE}>
        <span style={LABEL_STYLE}>Now</span>
        <div style={RULE_LINE} />
      </div>
      {nowCards.length === 0 ? (
        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--ink-faint)",
            fontStyle: "italic",
            padding: "0.4rem 0.6rem",
            marginBottom: "1rem",
            fontFamily: "var(--font-inter), Inter, sans-serif",
          }}
        >
          Nothing in progress — drag a card here or start one
        </div>
      ) : (
        <div style={{ marginBottom: "1rem" }}>
          {nowCards.map((c) => (
            <CardRow key={c.number} title={c.title} label={c.label} />
          ))}
        </div>
      )}

      {/* NEXT */}
      <div style={SECTION_RULE}>
        <span style={LABEL_STYLE}>Next</span>
        <div style={RULE_LINE} />
      </div>
      {nextCards.length === 0 ? (
        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--ink-faint)",
            fontStyle: "italic",
            padding: "0.4rem 0.6rem",
            marginBottom: "1rem",
            fontFamily: "var(--font-inter), Inter, sans-serif",
          }}
        >
          Nothing queued for today
        </div>
      ) : (
        <div style={{ marginBottom: "1rem" }}>
          {nextCards.map((c) => (
            <CardRow key={c.number} title={c.title} label={c.label} priority={getPriority(c.number)} />
          ))}
        </div>
      )}

      {/* Full Kanban button */}
      <button
        type="button"
        onClick={onOpenKanban}
        style={{
          width: "100%",
          padding: "0.65rem 1rem",
          borderRadius: 10,
          border: "1.5px solid var(--border)",
          background: "transparent",
          color: "var(--ink-dim)",
          fontFamily: "var(--font-inter), Inter, sans-serif",
          fontSize: "0.78rem",
          fontWeight: 500,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
          transition: "border-color 0.15s, color 0.15s, background 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--accent)";
          e.currentTarget.style.color = "var(--accent)";
          e.currentTarget.style.background = "rgba(13,107,63,0.04)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.color = "var(--ink-dim)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        Full Kanban
        <span style={{ fontSize: "0.7rem" }}>▸</span>
      </button>
    </div>
  );
}
