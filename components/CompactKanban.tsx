"use client";

import { useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useCardsContext } from "@/lib/CardsContext";
import { kzToUi, UI_COLUMNS, type UiColumn } from "@/lib/columnMapping";
import { usePriority, type Priority } from "@/lib/usePriority";
import { useCardLabels, PROJECT_LABELS } from "@/lib/useCardLabels";
import { useCreateCard } from "@/lib/useCreateCard";
import type { KzCardLite } from "@/lib/useCards";

/**
 * Compact 4-column kanban: Candidates | Today | Now | Done
 * Ming-styled. Today has collapsible H/M/L priority sub-groups.
 * Candidates and Done are collapsible. "Waiting" cards live in
 * the WaitingShelf (KZ "On Hold"), not here.
 * Cards show local project labels (not KZ's "Enhancement" default).
 */

const CARD_PREFIX = "card-";
const COL_PREFIX = "col-";

type MappedColumn = { ui: UiColumn; cards: KzCardLite[] };
type Labels = ReturnType<typeof useCardLabels>;
type Priorities = ReturnType<typeof usePriority>;

export default function CompactKanban() {
  const { columns } = useCardsContext();
  const priority = usePriority();
  const labels = useCardLabels();

  const mapped: MappedColumn[] = UI_COLUMNS.map((ui) => ({
    ui,
    cards: columns
      .filter((kzCol) => kzToUi(kzCol.title) === ui)
      .flatMap((kzCol) => kzCol.cards),
  }));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
        overflowY: "auto",
        padding: "0.75rem",
        flex: 1,
      }}
    >
      <QuickAdd labels={labels} />
      {mapped.map((col) => (
        <DroppableColumn
          key={col.ui}
          title={col.ui}
          cards={col.cards}
          priority={priority}
          labels={labels}
        />
      ))}
    </div>
  );
}

const colAccents: Record<UiColumn, string> = {
  Candidates: "var(--ink-faint)",
  Today: "var(--accent)",
  Now: "#6b9ac4",
  Done: "var(--short-break)",
};

const COLLAPSIBLE_COLUMNS = new Set<UiColumn>(["Candidates", "Done"]);

function DroppableColumn({
  title, cards, priority, labels,
}: {
  title: UiColumn; cards: KzCardLite[]; priority: Priorities; labels: Labels;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${COL_PREFIX}${title}` });
  const isCollapsible = COLLAPSIBLE_COLUMNS.has(title);
  const storageKey = `modusdaily:col:${title}`;

  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return !isCollapsible;
    if (!isCollapsible) return true;
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? stored === "1" : false;
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (isCollapsible) localStorage.setItem(storageKey, next ? "1" : "0");
  };

  const isTodayWithCards = title === "Today" && cards.length > 0;

  return (
    <section
      ref={setNodeRef}
      style={{
        borderRadius: 4,
        padding: "0.5rem",
        transition: "background 0.15s, box-shadow 0.15s",
        background: isOver
          ? "rgba(196, 138, 60, 0.06)"
          : title === "Now"
          ? "var(--bg-card)"
          : "transparent",
        outline: isOver ? "1px solid var(--accent-dim)" : "none",
        ...(title === "Now"
          ? {
              borderLeft: "3px solid var(--accent)",
              boxShadow: "inset 0 0 16px rgba(196, 138, 60, 0.06), 0 1px 4px rgba(0,0,0,0.15)",
              border: "1px solid var(--accent-dim)",
              borderLeftWidth: 3,
              borderLeftColor: "var(--accent)",
            }
          : {}),
      }}
    >
      {isCollapsible ? (
        <button
          type="button"
          onClick={toggle}
          style={{
            display: "flex", alignItems: "baseline", justifyContent: "space-between",
            width: "100%", background: "transparent", border: "none", cursor: "pointer",
            padding: "0 0.15rem", marginBottom: open ? "0.35rem" : 0, textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.45rem", transition: "transform 0.15s", transform: open ? "rotate(90deg)" : "rotate(0)", color: "var(--ink-faint)" }}>▶</span>
            <h3 style={{ fontFamily: '"Futura", "Trebuchet MS", sans-serif', fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: colAccents[title], margin: 0 }}>{title}</h3>
          </div>
          <span style={{ fontSize: "0.6rem", color: "var(--ink-faint)" }}>{cards.length}</span>
        </button>
      ) : (
        <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.35rem", padding: "0 0.15rem" }}>
          <h3 style={{ fontFamily: '"Futura", "Trebuchet MS", sans-serif', fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: colAccents[title], margin: 0 }}>{title}</h3>
          <span style={{ fontSize: "0.6rem", color: "var(--ink-faint)" }}>{cards.length}</span>
        </header>
      )}

      {(!isCollapsible || open) && (
        isTodayWithCards ? (
          <TodayPriorityGroups cards={cards} priority={priority} labels={labels} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {cards.length === 0 ? (
              <div style={{ border: "1px dashed var(--border)", borderRadius: 3, padding: "0.4rem 0.6rem", fontSize: "0.65rem", color: "var(--ink-faint)" }}>—</div>
            ) : (
              cards.map((card) => (
                <DraggableCard key={card.number} card={card} priority={priority} labels={labels} />
              ))
            )}
          </div>
        )
      )}
    </section>
  );
}

function TodayPriorityGroups({ cards, priority, labels }: { cards: KzCardLite[]; priority: Priorities; labels: Labels }) {
  const groups: { label: string; key: Priority; accent: string; cards: KzCardLite[] }[] = [
    { label: "High", key: "high", accent: "#c45a3c", cards: [] },
    { label: "Med", key: "medium", accent: "var(--accent)", cards: [] },
    { label: "Low", key: "low", accent: "var(--ink-faint)", cards: [] },
  ];

  for (const card of cards) {
    const p = priority.getPriority(card.number);
    const group = groups.find((g) => g.key === p);
    if (group) group.cards.push(card);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      {groups.map((g) => (
        <PrioritySubGroup key={g.key} label={g.label} accent={g.accent} cards={g.cards} priority={priority} labels={labels} />
      ))}
    </div>
  );
}

function PrioritySubGroup({
  label, accent, cards, priority, labels,
}: {
  label: string; accent: string; cards: KzCardLite[]; priority: Priorities; labels: Labels;
}) {
  const storageKey = `modusdaily:prigroup:${label}`;
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? stored === "1" : true;
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem(storageKey, next ? "1" : "0");
  };

  if (cards.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "transparent", border: "none", cursor: "pointer", padding: "0.2rem 0.15rem", width: "100%", textAlign: "left" }}
      >
        <span style={{ fontSize: "0.5rem", transition: "transform 0.15s", transform: open ? "rotate(90deg)" : "rotate(0)", color: "var(--ink-faint)" }}>▶</span>
        <span style={{ fontFamily: '"Futura", "Trebuchet MS", sans-serif', fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: accent }}>{label}</span>
        <span style={{ fontSize: "0.5rem", color: "var(--ink-faint)" }}>({cards.length})</span>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", paddingLeft: "0.4rem" }}>
          {cards.map((card) => (
            <DraggableCard key={card.number} card={card} priority={priority} labels={labels} />
          ))}
        </div>
      )}
    </div>
  );
}

function DraggableCard({
  card, priority, labels,
}: {
  card: KzCardLite; priority: Priorities; labels: Labels;
}) {
  const { setNodeRef, listeners, attributes, isDragging, transform } = useDraggable({
    id: `${CARD_PREFIX}${card.number}`,
  });

  const pri = priority.getPriority(card.number);
  const displayLabel = labels.getLabel(card.number, card.label);

  const priorityColors: Record<Priority, string> = {
    high: "#c45a3c",
    medium: "var(--accent)",
    low: "var(--ink-faint)",
  };
  const priorityLetters: Record<Priority, string> = {
    high: "H",
    medium: "M",
    low: "L",
  };

  // Click label to cycle through project labels
  const [editingLabel, setEditingLabel] = useState(false);

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.3 : 1,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    cursor: "grab",
    display: "flex",
    alignItems: "flex-start",
    gap: "0.4rem",
    borderRadius: 3,
    border: "1px solid var(--border)",
    background: "var(--bg-card)",
    padding: "0.35rem 0.5rem",
    transition: "border-color 0.15s, background 0.15s",
    userSelect: "none" as const,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {/* Priority badge — click to cycle H→M→L */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); priority.cyclePriority(card.number); }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          marginTop: "0.1rem",
          minWidth: 20,
          height: 18,
          flexShrink: 0,
          borderRadius: 3,
          background: "transparent",
          border: `1px solid ${priorityColors[pri]}`,
          color: priorityColors[pri],
          fontFamily: '"Futura", "Trebuchet MS", sans-serif',
          fontSize: "0.5rem",
          fontWeight: 700,
          letterSpacing: "0.05em",
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
        }}
        title={`Priority: ${pri} — click to cycle`}
      >
        {priorityLetters[pri]}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Label row — click to edit */}
        {editingLabel ? (
          <LabelPicker
            current={displayLabel}
            onSelect={(l) => { labels.setLabel(card.number, l); setEditingLabel(false); }}
            onClose={() => setEditingLabel(false)}
          />
        ) : (
          displayLabel ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditingLabel(true); }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                fontFamily: '"Futura", "Trebuchet MS", sans-serif', fontSize: "0.5rem",
                letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--accent)",
                background: "transparent", border: "none", cursor: "pointer", padding: 0,
                marginBottom: "0.1rem", display: "block",
              }}
            >
              {displayLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditingLabel(true); }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                fontFamily: '"Futura", "Trebuchet MS", sans-serif', fontSize: "0.45rem",
                letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)",
                background: "transparent", border: "none", cursor: "pointer", padding: 0,
                marginBottom: "0.1rem", display: "block", opacity: 0.6,
              }}
            >
              + label
            </button>
          )
        )}
        <div style={{ fontSize: "0.7rem", color: "var(--ink)", lineHeight: 1.3 }}>
          {card.title}
        </div>
      </div>
    </div>
  );
}

/** Inline label picker — shows known project labels as clickable chips */
function LabelPicker({
  current, onSelect, onClose,
}: {
  current: string; onSelect: (label: string) => void; onClose: () => void;
}) {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        display: "flex", flexWrap: "wrap", gap: "0.2rem", marginBottom: "0.2rem",
      }}
    >
      {PROJECT_LABELS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(l); }}
          style={{
            fontFamily: '"Futura", "Trebuchet MS", sans-serif',
            fontSize: "0.45rem", letterSpacing: "0.1em", textTransform: "uppercase",
            color: l === current ? "var(--ink)" : "var(--accent)",
            background: l === current ? "var(--accent-dim)" : "transparent",
            border: "1px solid var(--accent-dim)", borderRadius: 2,
            padding: "0.1rem 0.3rem", cursor: "pointer",
          }}
        >
          {l}
        </button>
      ))}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          fontSize: "0.45rem", color: "var(--ink-faint)",
          background: "transparent", border: "none", cursor: "pointer", padding: "0.1rem 0.2rem",
        }}
      >
        ✕
      </button>
    </div>
  );
}

/** Quick-add input with project label selector */
function QuickAdd({ labels }: { labels: Labels }) {
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const { createCard, creating } = useCreateCard();

  const submit = async () => {
    if (!value.trim() || creating) return;
    const result = await createCard(value.trim(), "Today", label);
    // Set local label for the new card if we picked one
    if (result?.created?.[0]?.number && label) {
      labels.setLabel(result.created[0].number, label);
    }
    setValue("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", padding: "0.15rem 0" }}>
      <div style={{ display: "flex", gap: "0.3rem" }}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Quick add to Today..."
          style={{
            flex: 1, background: "var(--bg-card)", border: "1px solid var(--accent-dim)",
            borderRadius: 3, padding: "0.35rem 0.5rem", fontSize: "0.7rem", color: "var(--ink)",
            fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif', outline: "none",
          }}
        />
        <button
          type="button"
          onClick={submit}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={creating || !value.trim()}
          style={{
            background: "transparent", border: "1px solid var(--accent-dim)", borderRadius: 3,
            padding: "0.25rem 0.5rem", fontFamily: '"Futura", "Trebuchet MS", sans-serif',
            fontSize: "0.5rem", letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--accent)", cursor: creating ? "wait" : "pointer",
            opacity: !value.trim() ? 0.4 : 1, transition: "opacity 0.15s", whiteSpace: "nowrap",
          }}
        >
          Add
        </button>
      </div>
      {/* Label chips for quick-add */}
      <div style={{ display: "flex", gap: "0.2rem", flexWrap: "wrap" }}>
        {PROJECT_LABELS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLabel(label === l ? "" : l)}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              fontFamily: '"Futura", "Trebuchet MS", sans-serif',
              fontSize: "0.4rem", letterSpacing: "0.1em", textTransform: "uppercase",
              color: label === l ? "var(--ink)" : "var(--ink-dim)",
              background: label === l ? "var(--accent-dim)" : "transparent",
              border: label === l ? "1px solid var(--accent)" : "1px solid var(--border)",
              borderRadius: 2, padding: "0.08rem 0.25rem", cursor: "pointer",
              transition: "all 0.1s",
            }}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
