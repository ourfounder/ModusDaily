"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import MingPomodoroDial from "@/components/ming/PomodoroDial";
import CompactKanban from "@/components/CompactKanban";
import ActiveCard from "@/components/ActiveCard";
import WaitingShelf from "@/components/WaitingShelf";
import BriefingPanel from "@/components/briefing/BriefingPanel";
import CalendarSection from "@/components/briefing/CalendarSection";
import NotesToPip from "@/components/NotesToPip";
import SkinSwitcher from "@/components/SkinSwitcher";
import { DayTypePicker, DayTypeBadge } from "@/components/DayTypeSelector";
import { CardsProvider, useCardsContext } from "@/lib/CardsContext";
import { kzToUi, uiToKz, WAITING_KZ_COLUMN } from "@/lib/columnMapping";
import { useDayType } from "@/lib/useDayType";
import { useBriefing } from "@/lib/useBriefing";
import { useLiveCalendar } from "@/lib/useLiveCalendar";
import { useWorkLog } from "@/lib/useWorkLog";
import { useResizableColumns } from "@/lib/useResizableColumns";

/**
 * ModusDaily — unified briefing + kanban + timer.
 *
 * Three-column Ming layout for a dedicated 4K 32" display.
 *
 *   Left (~420px):   Scrollable kanban (Hold | Today w/ priority groups | Now | Done)
 *   Center (flex):   Active Work drop zone + Ming watch-face timer
 *   Right (~380px):  Calendar + briefing sections + Notes to Pip
 *
 * DndContext wraps the entire shell so you can drag a card from the
 * left kanban and drop it on the center "Active Work" zone to move
 * it to In Progress (Now).
 */
export default function Home() {
  return (
    <CardsProvider>
      <ModusDailyShell />
    </CardsProvider>
  );
}

function ModusDailyShell() {
  const { config, needsSelection, select } = useDayType();
  const [showPicker, setShowPicker] = useState(false);
  const { log: logWork } = useWorkLog();

  // Morning ritual: show day-type picker if not selected today
  if (needsSelection || showPicker) {
    return (
      <main
        style={{
          display: "flex",
          height: "100vh",
          width: "100vw",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <div
            style={{
              fontFamily: '"Futura", "Trebuchet MS", sans-serif',
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "var(--ink)",
            }}
          >
            ModusDaily
          </div>
          <div style={{ marginTop: "0.3rem", fontSize: "0.6rem", color: "var(--ink-faint)" }}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
        <DayTypePicker
          onSelect={(dt) => {
            select(dt);
            logWork("day-type", { dayType: dt });
            setShowPicker(false);
          }}
        />
      </main>
    );
  }

  return (
    <DailyLayout config={config} onPickDay={() => setShowPicker(true)} />
  );
}

/**
 * The three-column layout — wrapped in its own DndContext so cards
 * can be dragged from the kanban onto the ActiveCard drop zone.
 */
function DailyLayout({
  config,
  onPickDay,
}: {
  config: ReturnType<typeof useDayType>["config"];
  onPickDay: () => void;
}) {
  const { columns, moveCard } = useCardsContext();
  const [dragCardNumber, setDragCardNumber] = useState<number | null>(null);
  const { log: logWork } = useWorkLog();
  const resize = useResizableColumns();
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Find the card being dragged (for the overlay ghost)
  const draggedCard = dragCardNumber
    ? columns.flatMap((c) => c.cards).find((c) => c.number === dragCardNumber)
    : null;

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith("card-")) {
      setDragCardNumber(Number(id.slice(5)));
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setDragCardNumber(null);
    const over = e.over;
    if (!over) return;
    const activeId = String(e.active.id);
    const overId = String(over.id);

    if (!activeId.startsWith("card-")) return;
    const cardNumber = Number(activeId.slice(5));

    // Helper: find card details for logging
    const movedCard = columns.flatMap((c) => c.cards).find((c) => c.number === cardNumber);
    const cardTitle = movedCard?.title ?? "";
    const cardLabel = movedCard?.label ?? "";

    // Dropped on the ActiveCard zone → move to "In Progress"
    if (overId === "active-work-drop") {
      logWork("active-switch", { cardNumber, title: cardTitle, label: cardLabel });
      logWork("card-move", { cardNumber, title: cardTitle, label: cardLabel, to: "In Progress" });
      void moveCard(cardNumber, "In Progress").catch(() => {});
      return;
    }

    // Dropped on the Waiting shelf → move to "On Hold"
    if (overId === "waiting-shelf") {
      logWork("card-move", { cardNumber, title: cardTitle, label: cardLabel, to: "On Hold" });
      void moveCard(cardNumber, WAITING_KZ_COLUMN).catch(() => {});
      return;
    }

    // Dropped on a kanban column
    if (overId.startsWith("col-")) {
      const toUiColumn = overId.slice(4);
      const toKzColumn = uiToKz(toUiColumn as Parameters<typeof uiToKz>[0]);
      const fromKzCol = columns.find((c) =>
        c.cards.some((card) => card.number === cardNumber)
      );
      if (fromKzCol && kzToUi(fromKzCol.title) === toUiColumn) return;
      logWork("card-move", { cardNumber, title: cardTitle, label: cardLabel, to: toKzColumn });
      void moveCard(cardNumber, toKzColumn).catch(() => {});
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragCardNumber(null)}
    >
      <main
        style={{
          display: "flex",
          height: "100vh",
          width: "100vw",
          overflow: "hidden",
          background: "var(--bg)",
        }}
      >
        {/* ═══ Left — Kanban ═══ */}
        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            width: resize.leftWidth,
            flexShrink: 0,
            background: "var(--bg-card)",
            overflow: "hidden",
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--border)",
              padding: "0.6rem 0.9rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  fontFamily: '"Futura", "Trebuchet MS", sans-serif',
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "var(--ink)",
                }}
              >
                ModusDaily
              </div>
              <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)" }}>
                <button
                  type="button"
                  style={{
                    padding: "0.2rem 0.55rem",
                    border: "none",
                    background: "var(--accent-dim)",
                    color: "var(--accent)",
                    fontFamily: '"Futura", "Trebuchet MS", sans-serif',
                    fontSize: "0.52rem",
                    fontWeight: 700,
                    cursor: "default",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/notebook")}
                  style={{
                    padding: "0.2rem 0.55rem",
                    border: "none",
                    borderLeft: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--ink-faint)",
                    fontFamily: '"Futura", "Trebuchet MS", sans-serif',
                    fontSize: "0.52rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-faint)")}
                >
                  Notebook
                </button>
              </div>
            </div>
            {config && (
              <DayTypeBadge config={config} onClick={onPickDay} />
            )}
          </header>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <CompactKanban />
          </div>
        </aside>

        {/* Left resize handle */}
        <div
          onPointerDown={(e) => resize.onPointerDown("left", e)}
          style={{
            width: 5,
            flexShrink: 0,
            cursor: "col-resize",
            background: "var(--border)",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-dim)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--border)")}
        />

        {/* ═══ Center — Timer fills the space; active card above ═══ */}
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <CenterPanel />
        </div>

        {/* Right resize handle */}
        <div
          onPointerDown={(e) => resize.onPointerDown("right", e)}
          style={{
            width: 5,
            flexShrink: 0,
            cursor: "col-resize",
            background: "var(--border)",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-dim)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--border)")}
        />

        {/* ═══ Right — Calendar + Briefing + Notes ═══ */}
        <RightPanel rightWidth={resize.rightWidth} />
      </main>

      {/* Drag overlay ghost */}
      <DragOverlay dropAnimation={null}>
        {draggedCard ? (
          <div
            style={{
              width: 260,
              borderRadius: 3,
              border: "1px solid var(--accent)",
              background: "var(--bg-card)",
              padding: "0.35rem 0.5rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {draggedCard.label && (
              <div
                style={{
                  fontFamily: '"Futura", "Trebuchet MS", sans-serif',
                  fontSize: "0.5rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  marginBottom: "0.1rem",
                }}
              >
                {draggedCard.label}
              </div>
            )}
            <div style={{ fontSize: "0.7rem", color: "var(--ink)" }}>
              {draggedCard.title}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Center panel — the chronograph is the centrepiece.
 * Active card is a framed drop zone above the dial.
 * Beautiful, not cramped.
 */
function CenterPanel() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Scrollable upper area: Now card + chronograph */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: "1.2rem",
          padding: "1.5rem 2rem 0.5rem",
          overflowY: "auto",
          width: "100%",
        }}
      >
        <ActiveCard />
        <div
          style={{
            transform: "scale(0.72)",
            transformOrigin: "center top",
          }}
        >
          <MingPomodoroDial />
        </div>
      </div>

      {/* On Hold shelf — pinned to bottom, always visible */}
      <div
        style={{
          width: "100%",
          flexShrink: 0,
          padding: "0.5rem 1.5rem 0.75rem",
        }}
      >
        <WaitingShelf />
      </div>
    </div>
  );
}

/** Right column: calendar (prominent), briefing sections, notes to pip. */
function RightPanel({ rightWidth }: { rightWidth: number }) {
  const { data, loading, error, refresh } = useBriefing();
  const liveCalendar = useLiveCalendar(data?.calendar ?? null);

  return (
    <aside
      style={{
        display: "flex",
        flexDirection: "column",
        width: rightWidth,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
          padding: "0.6rem 0.9rem",
        }}
      >
        <div
          style={{
            fontFamily: '"Futura", "Trebuchet MS", sans-serif',
            fontSize: "0.55rem",
            fontWeight: 700,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "var(--ink-dim)",
          }}
        >
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </div>
        <SkinSwitcher />
      </header>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {loading && (
          <div
            style={{
              fontFamily: '"Futura", "Trebuchet MS", sans-serif',
              fontSize: "0.6rem",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              padding: "0.5rem",
            }}
          >
            Loading briefing...
          </div>
        )}

        {error && (
          <div
            style={{
              borderRadius: 4,
              border: "1px solid rgba(196, 90, 60, 0.3)",
              background: "rgba(196, 90, 60, 0.06)",
              padding: "0.6rem 0.75rem",
              fontSize: "0.75rem",
              color: "#d4806a",
            }}
          >
            {error}
            <button
              type="button"
              onClick={refresh}
              style={{
                marginLeft: "0.75rem",
                background: "rgba(196, 90, 60, 0.15)",
                border: "none",
                borderRadius: 3,
                padding: "0.2rem 0.5rem",
                fontFamily: '"Futura", "Trebuchet MS", sans-serif',
                fontSize: "0.55rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#d4806a",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {data && (
          <>
            <CalendarSection events={liveCalendar.events} onRefresh={liveCalendar.refresh} />

            {data.fileModified && (() => {
              const staleHours = Math.round(
                (Date.now() - new Date(data.fileModified).getTime()) / 3600000
              );
              return staleHours > 4 ? (
                <div
                  style={{
                    borderRadius: 3,
                    background: "rgba(196, 138, 60, 0.06)",
                    border: "1px solid var(--accent-dim)",
                    padding: "0.3rem 0.5rem",
                    fontSize: "0.6rem",
                    color: "var(--accent)",
                  }}
                >
                  Briefing is {staleHours}h old.
                </div>
              ) : null;
            })()}

            {data.bigDayBanner && (
              <div
                style={{
                  borderRadius: 4,
                  border: "1px solid var(--accent-dim)",
                  background: "rgba(196, 138, 60, 0.06)",
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.75rem",
                  color: "var(--ink)",
                }}
              >
                {data.bigDayBanner}
              </div>
            )}

            <BriefingPanel data={data} />
          </>
        )}

        <NotesToPip />
      </div>
    </aside>
  );
}
