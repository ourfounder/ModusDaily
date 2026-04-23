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
 * Ops-display kanban rail — live data from /api/kz/cards.
 *
 * Cards drag between columns via @dnd-kit/core. Drop target is the
 * column section; server POST is optimistic via useCards().moveCard.
 *
 * Column order mirrors the ModusOS KZ board target layout:
 *   Candidates | Today | In Progress | On Hold | Done
 * Context and Archive columns are hidden from the rail (they feed the right rail).
 */

const HIDDEN_COLUMNS = new Set(["context", "archive"]);
const CARD_PREFIX = "card-";
const COL_PREFIX = "col-";

export default function KanbanRail() {
  const { columns, loading, error, moveCard, refresh } = useCardsContext();
  const visible = columns.filter(
    (c) => !HIDDEN_COLUMNS.has(c.title.toLowerCase())
  );

  const [activeCard, setActiveCard] = useState<KzCardLite | null>(null);

  // Require 5px drag before activating so clicks on the card still work later.
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
      <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
        <PopulateBar onDone={refresh} />
        {loading && columns.length === 0 && (
          <div className="text-xs text-slate-500">Loading cards…</div>
        )}
        {error && (
          <div className="rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {visible.map((col) => (
          <DroppableColumn key={col.title} title={col.title} count={col.cards.length}>
            {col.cards.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-800 px-3 py-4 text-xs text-slate-600">
                —
              </div>
            ) : (
              col.cards.map((card) => <DraggableCard key={card.number} card={card} />)
            )}
          </DroppableColumn>
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? <CardGhost card={activeCard} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({
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
      className={`rounded-md transition-colors ${
        isOver ? "bg-indigo-950/30 ring-1 ring-indigo-700/60" : ""
      }`}
    >
      <header className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
          {title}
        </h2>
        <span className="text-xs text-slate-600">{count}</span>
      </header>
      <div className="space-y-2 px-1 pb-2">{children}</div>
    </section>
  );
}

function DraggableCard({ card }: { card: KzCardLite }) {
  const { setNodeRef, listeners, attributes, isDragging, transform } = useDraggable({
    id: `${CARD_PREFIX}${card.number}`,
  });
  const style: React.CSSProperties = {
    opacity: isDragging ? 0.35 : 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    cursor: "grab",
  };
  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="group relative select-none rounded-md border border-slate-800 bg-slate-900/40 p-3 transition-colors hover:border-slate-600 hover:bg-slate-900/70"
    >
      {card.label && (
        <div className="mb-1 text-[10px] uppercase tracking-widest text-indigo-300">
          {card.label}
        </div>
      )}
      <div className="text-sm text-slate-200">{card.title}</div>
      <div className="mt-1 text-[10px] text-slate-600">#{card.number}</div>
    </article>
  );
}

function CardGhost({ card }: { card: KzCardLite }) {
  return (
    <article className="w-[320px] rounded-md border border-indigo-500 bg-slate-900/95 p-3 shadow-2xl">
      {card.label && (
        <div className="mb-1 text-[10px] uppercase tracking-widest text-indigo-300">
          {card.label}
        </div>
      )}
      <div className="text-sm text-slate-200">{card.title}</div>
      <div className="mt-1 text-[10px] text-slate-600">#{card.number}</div>
    </article>
  );
}

function PopulateBar({ onDone }: { onDone: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(dryRun: boolean) {
    setBusy(true);
    setMsg(dryRun ? "Previewing…" : "Populating…");
    try {
      const res = await fetch(`/api/kz/populate${dryRun ? "?dryRun=1" : ""}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (dryRun) {
        setMsg(
          `Would create ${data.totals.wouldCreate}, skip ${data.totals.skipped}.`
        );
      } else {
        setMsg(
          `Created ${data.totals.created}, skipped ${data.totals.skipped}, errors ${data.totals.errors}.`
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
    <div className="flex flex-col gap-1 rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(false)}
          className="rounded border border-indigo-900 bg-indigo-950/40 px-3 py-1 text-xs font-medium uppercase tracking-widest text-indigo-200 transition-colors hover:border-indigo-500 hover:bg-indigo-900/40 disabled:opacity-50"
        >
          Populate
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(true)}
          className="rounded px-2 py-1 text-[10px] uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-200 disabled:opacity-50"
        >
          Preview
        </button>
      </div>
      {msg && <div className="text-[10px] text-slate-500">{msg}</div>}
    </div>
  );
}
