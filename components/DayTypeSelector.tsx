"use client";

import { DAY_TYPES, type DayType, type DayTypeConfig } from "@/lib/useDayType";

/**
 * Morning ritual — "What kind of day do you want to have?"
 * Ming-styled: warm umber cards, brass accents, serif body.
 */

export function DayTypePicker({
  onSelect,
}: {
  onSelect: (dt: DayType) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", padding: "2rem 0" }}>
      <div
        style={{
          fontFamily: '"Futura", "Trebuchet MS", sans-serif',
          fontSize: "0.6rem",
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          color: "var(--ink-faint)",
        }}
      >
        What kind of day do you want to have?
      </div>
      <div style={{ display: "flex", gap: "1rem" }}>
        {DAY_TYPES.map((dt) => (
          <DayTypeCard key={dt.id} config={dt} onSelect={() => onSelect(dt.id)} />
        ))}
      </div>
    </div>
  );
}

function DayTypeCard({
  config,
  onSelect,
}: {
  config: DayTypeConfig;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: "flex",
        width: "11rem",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.6rem",
        borderRadius: 4,
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        padding: "1.2rem 1rem",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent-dim)";
        e.currentTarget.style.background = "var(--bg-card-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background = "var(--bg-card)";
      }}
    >
      <span style={{ fontSize: "1.8rem" }}>{config.emoji}</span>
      <span
        style={{
          fontFamily: '"Futura", "Trebuchet MS", sans-serif',
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--accent)",
        }}
      >
        {config.label}
      </span>
      <span style={{ fontSize: "0.7rem", lineHeight: 1.4, color: "var(--ink-dim)", textAlign: "center" }}>
        {config.description}
      </span>
      <span
        style={{
          marginTop: "0.2rem",
          fontSize: "0.6rem",
          color: "var(--ink-faint)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {config.workMinutes}m work · {config.shortBreakMinutes}m break
      </span>
    </button>
  );
}

/** Compact header badge showing current day type. Clickable to re-select. */
export function DayTypeBadge({
  config,
  onClick,
}: {
  config: DayTypeConfig;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        borderRadius: 999,
        border: "1px solid var(--accent-dim)",
        background: "transparent",
        padding: "0.25rem 0.6rem",
        fontSize: "0.65rem",
        fontWeight: 500,
        color: "var(--accent)",
        cursor: "pointer",
        transition: "background 0.15s",
        fontFamily: '"Futura", "Trebuchet MS", sans-serif',
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-dim)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </button>
  );
}
