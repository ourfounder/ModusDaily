"use client";

import { useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import { useCreateCard } from "@/lib/useCreateCard";
import type { ActionStack } from "@/lib/briefing/parseFullBriefing";

export default function ActionStackSection({ stack }: { stack: ActionStack }) {
  const total = stack.mustDo.length + stack.meetings.length + stack.watching.length;

  return (
    <CollapsibleSection
      id="action-stack"
      title="Action Stack"
      badge={total}
      accentColor="var(--accent)"
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem" }}>
        <ActionColumn
          label="Must Do"
          items={stack.mustDo}
          accentColor="#c45a3c"
          defaultColumn="Today"
        />
        <ActionColumn
          label="Meetings"
          items={stack.meetings}
          accentColor="var(--accent)"
          defaultColumn="Today"
        />
        <ActionColumn
          label="Watching"
          items={stack.watching}
          accentColor="var(--short-break)"
          defaultColumn="Candidates"
        />
      </div>
    </CollapsibleSection>
  );
}

function ActionColumn({
  label,
  items,
  accentColor,
  defaultColumn,
}: {
  label: string;
  items: string[];
  accentColor: string;
  defaultColumn: string;
}) {
  return (
    <div
      style={{
        borderRadius: 3,
        border: "1px solid var(--border)",
        background: "rgba(15, 13, 10, 0.5)",
        padding: "0.6rem",
      }}
    >
      <div
        style={{
          fontFamily: '"Futura", "Trebuchet MS", sans-serif',
          fontSize: "0.55rem",
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: accentColor,
          marginBottom: "0.4rem",
        }}
      >
        {label}
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        {items.map((item, i) => (
          <ActionItem key={i} text={item} label={label} column={defaultColumn} />
        ))}
        {items.length === 0 && (
          <li style={{ fontSize: "0.65rem", color: "var(--ink-faint)", fontStyle: "italic" }}>
            —
          </li>
        )}
      </ul>
    </div>
  );
}

function ActionItem({
  text,
  label,
  column,
}: {
  text: string;
  label: string;
  column: string;
}) {
  const { createCard, creating } = useCreateCard();
  const [sent, setSent] = useState(false);

  const sendToBoard = async () => {
    await createCard(text, column, label);
    setSent(true);
  };

  return (
    <li
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.3rem",
        fontSize: "0.7rem",
        lineHeight: 1.5,
        color: "var(--ink-dim)",
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>{text}</span>
      {!sent ? (
        <button
          type="button"
          onClick={sendToBoard}
          disabled={creating}
          title={`Send to ${column}`}
          style={{
            flexShrink: 0,
            background: "transparent",
            border: "none",
            padding: "0 0.15rem",
            fontSize: "0.6rem",
            color: "var(--accent-dim)",
            cursor: creating ? "wait" : "pointer",
            opacity: creating ? 0.5 : 0.6,
            transition: "opacity 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.6";
            e.currentTarget.style.color = "var(--accent-dim)";
          }}
        >
          →
        </button>
      ) : (
        <span style={{ flexShrink: 0, fontSize: "0.55rem", color: "var(--short-break)" }}>
          ✓
        </span>
      )}
    </li>
  );
}
