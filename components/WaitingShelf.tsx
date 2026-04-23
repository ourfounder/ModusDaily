"use client";

import { useDroppable, useDraggable } from "@dnd-kit/core";
import { useCardsContext } from "@/lib/CardsContext";
import { useCardLabels } from "@/lib/useCardLabels";
import type { KzCardLite } from "@/lib/useCards";

/**
 * Waiting shelf — sits below the chronograph in the center column.
 *
 * Shows cards from KZ's "On Hold" column — things where the ball
 * is in someone else's court. Drag a card here to move it to On Hold.
 * Drag it back to a kanban column to un-wait it.
 *
 * Cards render as readable tiles flowing left to right.
 */

export default function WaitingShelf() {
  const { columns } = useCardsContext();
  const labels = useCardLabels();
  const { setNodeRef, isOver } = useDroppable({ id: "waiting-shelf" });

  const onHold = columns.find(
    (c) => c.title.toLowerCase() === "on hold"
  );
  const cards = onHold?.cards ?? [];

  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        padding: "0.6rem 0.8rem",
        borderRadius: 6,
        border: isOver
          ? "1.5px solid var(--accent)"
          : "1px solid var(--border)",
        background: isOver
          ? "rgba(196, 138, 60, 0.06)"
          : "rgba(196, 138, 60, 0.02)",
        transition: "border-color 0.15s, background 0.15s",
        minHeight: 48,
      }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: '"Futura", "Trebuchet MS", sans-serif',
          fontSize: "0.6rem",
          fontWeight: 700,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: isOver ? "var(--accent)" : "var(--ink-dim)",
          transition: "color 0.15s",
        }}
      >
        On Hold{cards.length > 0 ? ` \u00B7 ${cards.length}` : ""}
      </div>

      {/* Tiles row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "stretch",
        }}
      >
        {cards.length === 0 && !isOver && (
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--ink-faint)",
              padding: "0.2rem 0",
            }}
          >
            Drag cards here when waiting on someone
          </div>
        )}

        {cards.map((card) => (
          <WaitingTile key={card.number} card={card} labels={labels} />
        ))}

        {isOver && (
          <div
            style={{
              width: 160,
              minHeight: 52,
              borderRadius: 4,
              border: "1.5px dashed var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.7rem",
              color: "var(--accent)",
            }}
          >
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

function WaitingTile({
  card,
  labels,
}: {
  card: KzCardLite;
  labels: ReturnType<typeof useCardLabels>;
}) {
  const { setNodeRef, listeners, attributes, isDragging, transform } =
    useDraggable({ id: `card-${card.number}` });

  const displayLabel = labels.getLabel(card.number, card.label);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        width: 170,
        minHeight: 52,
        flexShrink: 0,
        borderRadius: 4,
        border: "1px solid var(--accent-dim)",
        background: "rgba(196, 138, 60, 0.04)",
        padding: "0.4rem 0.5rem",
        cursor: "grab",
        opacity: isDragging ? 0.3 : 1,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "0.2rem",
        userSelect: "none" as const,
      }}
    >
      {displayLabel && (
        <div
          style={{
            fontFamily: '"Futura", "Trebuchet MS", sans-serif',
            fontSize: "0.55rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--accent)",
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayLabel}
        </div>
      )}
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--ink)",
          lineHeight: 1.3,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {card.title}
      </div>
    </div>
  );
}
