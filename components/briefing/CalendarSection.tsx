"use client";

import CollapsibleSection from "@/components/CollapsibleSection";
import type { CalendarEvent } from "@/lib/briefing/parseFullBriefing";

const GHOST_MEETINGS = new Set(["jt huddle"]);

export default function CalendarSection({ events, onRefresh }: { events: CalendarEvent[]; onRefresh?: () => void }) {
  const visible = events.filter(
    (e) => !GHOST_MEETINGS.has(e.title.toLowerCase().trim())
  );
  const active = visible.filter((e) => !e.classes.includes("declined"));
  const declined = visible.filter((e) => e.classes.includes("declined"));

  return (
    <CollapsibleSection
      id="calendar"
      title="Calendar"
      badge={active.length}
      accentColor="var(--accent)"
      action={onRefresh ? (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onRefresh(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onRefresh(); } }}
          title="Refresh calendar"
          style={{
            cursor: "pointer",
            padding: "0.15rem 0.3rem",
            fontSize: "0.7rem",
            color: "var(--ink-faint)",
            lineHeight: 1,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-faint)")}
        >
          ↻
        </span>
      ) : undefined}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        {active.map((ev, i) => (
          <EventRow key={i} event={ev} />
        ))}
        {declined.length > 0 && (
          <div style={{ borderTop: "1px solid var(--border)", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
            <div
              style={{
                fontFamily: '"Futura", "Trebuchet MS", sans-serif',
                fontSize: "0.55rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
                marginBottom: "0.3rem",
              }}
            >
              Declined
            </div>
            {declined.map((ev, i) => (
              <EventRow key={`d-${i}`} event={ev} dimmed />
            ))}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

function EventRow({ event, dimmed }: { event: CalendarEvent; dimmed?: boolean }) {
  const isPriority = event.classes.includes("priority");
  const isNew = event.classes.includes("new-client");

  return (
    <div
      style={{
        display: "flex",
        gap: "0.6rem",
        padding: "0.35rem 0.5rem",
        borderRadius: 3,
        opacity: dimmed ? 0.35 : 1,
        borderLeft: isPriority
          ? "2px solid var(--accent)"
          : isNew
          ? "2px solid var(--short-break)"
          : "2px solid transparent",
        background: isPriority
          ? "rgba(196, 138, 60, 0.05)"
          : isNew
          ? "rgba(138, 154, 107, 0.05)"
          : "transparent",
        fontSize: "0.75rem",
      }}
    >
      <div
        style={{
          width: "5.5rem",
          flexShrink: 0,
          color: "var(--ink-dim)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {event.time}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            color: dimmed ? "var(--ink-faint)" : "var(--ink)",
            textDecoration: dimmed ? "line-through" : "none",
          }}
        >
          {event.title}
          {event.badge && !dimmed && (
            <span
              style={{
                marginLeft: "0.5rem",
                background: "var(--border)",
                borderRadius: 2,
                padding: "0.1rem 0.35rem",
                fontSize: "0.55rem",
                color: "var(--ink-dim)",
              }}
            >
              {event.badge}
            </span>
          )}
        </div>
        {event.meta.length > 0 && !dimmed && (
          <div style={{ fontSize: "0.65rem", color: "var(--ink-dim)", marginTop: "0.15rem" }}>
            {event.meta[0]}
          </div>
        )}
      </div>
    </div>
  );
}
