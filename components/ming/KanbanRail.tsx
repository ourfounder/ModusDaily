"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { type KzCardLite } from "@/lib/useCards";
import { useCardsContext } from "@/lib/CardsContext";

/**
 * Ming-variant kanban rail — live data from /api/kz/cards.
 *
 * Same state hook as the ops-display rail; only the presentation
 * differs (warm umber palette, serif, brass accents, Futura caps).
 * Drag-and-drop via @dnd-kit/core; drop target is the column section.
 */

const HIDDEN_COLUMNS = new Set(["context", "archive"]);
const CARD_PREFIX = "card-";
const COL_PREFIX = "col-";

const SUBTITLES: Record<string, string> = {
  Today: "Drawn from the barrel this morning.",
  "In Progress": "In your hands right now.",
  "On Hold": "Resting, by choice or by dependency.",
  Candidates: "Waiting to be considered.",
  Done: "Laid down. Aging well.",
};

export default function MingKanbanRail() {
  const { columns, loading, error, moveCard, refresh } = useCardsContext();
  const visible = columns.filter(
    (c) => !HIDDEN_COLUMNS.has(c.title.toLowerCase())
  );

  const [activeCard, setActiveCard] = useState<KzCardLite | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (!id.startsWith(CARD_PREFIX)) return;
    const num = Number(id.slice(CARD_PREFIX.length));
    for (const col of columns) {
      const card = col.cards.find((c) => c.number === num);
      if (card) {
        setActiveCard(card);
        return;
      }
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveCard(null);
    const over = e.over;
    if (!over) return;
    const activeId = String(e.active.id);
    const overId = String(over.id);
    if (!activeId.startsWith(CARD_PREFIX) || !overId.startsWith(COL_PREFIX)) return;
    const cardNumber = Number(activeId.slice(CARD_PREFIX.length));
    const toColumnTitle = overId.slice(COL_PREFIX.length);

    const fromCol = columns.find((c) =>
      c.cards.some((card) => card.number === cardNumber)
    );
    if (fromCol && fromCol.title.toLowerCase() === toColumnTitle.toLowerCase())
      return;

    void moveCard(cardNumber, toColumnTitle).catch(() => {
      /* rollback handled inside useCards */
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveCard(null)}
    >
      <div style={{ paddingTop: "0.6rem" }}>
        <MingPopulateBar onDone={refresh} />
        {loading && columns.length === 0 && (
          <div style={{ color: "#5b5143", fontStyle: "italic", fontSize: "0.85rem" }}>
            Drawing from the cellar…
          </div>
        )}
        {error && (
          <div
            style={{
              border: "1px solid #6b3a3a",
              background: "#1a0e0e",
              borderRadius: 4,
              padding: "0.6rem 0.8rem",
              color: "#c39595",
              fontSize: "0.8rem",
            }}
          >
            {error}
          </div>
        )}

        {visible.map((col) => (
          <MingDroppableColumn
            key={col.title}
            title={col.title}
            count={col.cards.length}
          >
            {col.cards.length === 0 ? (
              <div
                style={{
                  border: "1px dashed #2a241c",
                  borderRadius: 4,
                  padding: "0.7rem 1rem",
                  color: "#5b5143",
                  fontStyle: "italic",
                  fontSize: "0.82rem",
                }}
              >
                — nothing resting here —
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
              >
                {col.cards.map((card) => (
                  <MingDraggableCard key={card.number} card={card} />
                ))}
              </div>
            )}
          </MingDroppableColumn>
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? <MingCardGhost card={activeCard} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function MingDroppableColumn({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${COL_PREFIX}${title}` });
  return (
    <section
      ref={setNodeRef}
      style={{
        marginBottom: "2rem",
        borderRadius: 4,
        padding: "0.2rem 0.3rem",
        background: isOver ? "rgba(196, 138, 60, 0.08)" : "transparent",
        border: isOver ? "1px solid rgba(196, 138, 60, 0.55)" : "1px solid transparent",
        transition: "background 120ms ease, border-color 120ms ease",
      }}
    >
      <h2
        style={{
          fontFamily: "Futura, 'Trebuchet MS', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontSize: "0.82rem",
          color: "#9a8f7a",
          margin: "1.2rem 0 0.3rem",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <span>{title}</span>
        <span
          style={{
            fontFamily:
              "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
            fontSize: "0.78rem",
            fontWeight: 400,
            letterSpacing: "normal",
            textTransform: "none",
            color: "#5b5143",
            fontStyle: "italic",
          }}
        >
          {count}
        </span>
      </h2>
      <p
        style={{
          color: "#5b5143",
          fontSize: "0.78rem",
          fontStyle: "italic",
          margin: "0 0 0.8rem",
        }}
      >
        {SUBTITLES[title] ?? ""}
      </p>
      {children}
    </section>
  );
}

function MingDraggableCard({ card }: { card: KzCardLite }) {
  const { setNodeRef, listeners, attributes, isDragging, transform } = useDraggable({
    id: `${CARD_PREFIX}${card.number}`,
  });
  const style: React.CSSProperties = {
    opacity: isDragging ? 0.35 : 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    cursor: "grab",
    userSelect: "none",
  };
  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="ming-card"
    >
      {card.label && <div className="ming-card-label">{card.label}</div>}
      <div className="ming-card-title">{card.title}</div>
      <div
        style={{
          marginTop: "0.3rem",
          fontFamily:
            "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
          fontSize: "0.72rem",
          fontStyle: "italic",
          color: "#5b5143",
        }}
      >
        №{card.number}
      </div>
    </article>
  );
}

function MingCardGhost({ card }: { card: KzCardLite }) {
  return (
    <article
      className="ming-card"
      style={{
        width: 320,
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.6)",
        borderColor: "#c48a3c",
      }}
    >
      {card.label && <div className="ming-card-label">{card.label}</div>}
      <div className="ming-card-title">{card.title}</div>
      <div
        style={{
          marginTop: "0.3rem",
          fontFamily:
            "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
          fontSize: "0.72rem",
          fontStyle: "italic",
          color: "#5b5143",
        }}
      >
        №{card.number}
      </div>
    </article>
  );
}

function MingPopulateBar({ onDone }: { onDone: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(dryRun: boolean) {
    setBusy(true);
    setMsg(dryRun ? "Reading the briefing…" : "Drawing from the cellar…");
    try {
      const res = await fetch(`/api/kz/populate${dryRun ? "?dryRun=1" : ""}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (dryRun) {
        setMsg(
          `Would pour ${data.totals.wouldCreate}; already poured ${data.totals.skipped}.`
        );
      } else {
        setMsg(
          `Poured ${data.totals.created}; skipped ${data.totals.skipped}${
            data.totals.errors ? `; errors ${data.totals.errors}` : ""
          }.`
        );
        await onDone();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        marginBottom: "1rem",
        padding: "0.7rem 0.9rem",
        background: "#1a1612",
        border: "1px solid #2a241c",
        borderRadius: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(false)}
          className="ming-btn"
          style={{ opacity: busy ? 0.5 : 1 }}
        >
          Populate
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(true)}
          className="ming-btn-quiet"
          style={{ opacity: busy ? 0.5 : 1 }}
        >
          Preview
        </button>
      </div>
      {msg && (
        <div
          style={{
            marginTop: "0.4rem",
            color: "#5b5143",
            fontStyle: "italic",
            fontSize: "0.78rem",
          }}
        >
          {msg}
        </div>
      )}
    </div>
  );
}
