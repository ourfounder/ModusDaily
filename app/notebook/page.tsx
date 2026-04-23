"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import LuxeDial from "@/components/notebook/LuxeDial";
import ActiveCard from "@/components/ActiveCard";
import CalendarSection from "@/components/briefing/CalendarSection";
import BriefingPanel from "@/components/briefing/BriefingPanel";
import SkinSwitcher from "@/components/SkinSwitcher";
import { DayTypePicker, DayTypeBadge } from "@/components/DayTypeSelector";
import ClockPanel from "@/components/notebook/ClockPanel";
import NowNextList from "@/components/notebook/NowNextList";
import KanbanDrawer from "@/components/notebook/KanbanDrawer";
import { CardsProvider, useCardsContext } from "@/lib/CardsContext";
import { kzToUi, uiToKz, WAITING_KZ_COLUMN } from "@/lib/columnMapping";
import { useDayType } from "@/lib/useDayType";
import { useBriefing } from "@/lib/useBriefing";
import { useLiveCalendar } from "@/lib/useLiveCalendar";
import { useWorkLog } from "@/lib/useWorkLog";

const STORAGE_KEY_LEFT_W = "modusdaily:notebook:leftWidth";
const DEFAULT_LEFT = 360;
const MIN_LEFT = 240;
const MAX_LEFT = 560;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function useNotebookResize() {
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LEFT_W);
      if (raw) setLeftWidth(clamp(Number(raw), MIN_LEFT, MAX_LEFT));
    } catch { /* ignore */ }
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = leftWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [leftWidth]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const next = clamp(startW.current + (e.clientX - startX.current), MIN_LEFT, MAX_LEFT);
      setLeftWidth(next);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setLeftWidth((w) => { try { localStorage.setItem(STORAGE_KEY_LEFT_W, String(w)); } catch { /* ignore */ } return w; });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, []);

  return { leftWidth, onPointerDown };
}

export default function NotebookPage() {
  return (
    <CardsProvider>
      <NotebookShell />
    </CardsProvider>
  );
}

function NotebookShell() {
  const { config, needsSelection, select } = useDayType();
  const [showPicker, setShowPicker] = useState(false);
  const { log: logWork } = useWorkLog();

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
              fontFamily: "var(--font-inter), Inter, sans-serif",
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink)",
            }}
          >
            ModusDaily
          </div>
          <div style={{ marginTop: "0.3rem", fontSize: "0.6rem", color: "var(--ink-faint)" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
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

  return <NotebookLayout config={config} onPickDay={() => setShowPicker(true)} />;
}

function NotebookLayout({
  config,
  onPickDay,
}: {
  config: ReturnType<typeof useDayType>["config"];
  onPickDay: () => void;
}) {
  const { columns, moveCard } = useCardsContext();
  const [dragCardNumber, setDragCardNumber] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const { log: logWork } = useWorkLog();
  const router = useRouter();
  const resize = useNotebookResize();

  const { data, loading, refresh } = useBriefing();
  const liveCalendar = useLiveCalendar(data?.calendar ?? null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const draggedCard = dragCardNumber
    ? columns.flatMap((c) => c.cards).find((c) => c.number === dragCardNumber)
    : null;

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith("card-")) setDragCardNumber(Number(id.slice(5)));
  }

  function onDragEnd(e: DragEndEvent) {
    setDragCardNumber(null);
    const over = e.over;
    if (!over) return;
    const activeId = String(e.active.id);
    const overId = String(over.id);
    if (!activeId.startsWith("card-")) return;
    const cardNumber = Number(activeId.slice(5));
    const movedCard = columns.flatMap((c) => c.cards).find((c) => c.number === cardNumber);
    const cardTitle = movedCard?.title ?? "";
    const cardLabel = movedCard?.label ?? "";

    if (overId === "active-work-drop") {
      logWork("active-switch", { cardNumber, title: cardTitle, label: cardLabel });
      logWork("card-move", { cardNumber, title: cardTitle, label: cardLabel, to: "In Progress" });
      void moveCard(cardNumber, "In Progress").catch(() => {});
      return;
    }
    if (overId === "waiting-shelf") {
      logWork("card-move", { cardNumber, title: cardTitle, label: cardLabel, to: "On Hold" });
      void moveCard(cardNumber, WAITING_KZ_COLUMN).catch(() => {});
      return;
    }
    if (overId.startsWith("col-")) {
      const toUiColumn = overId.slice(4);
      const toKzColumn = uiToKz(toUiColumn as Parameters<typeof uiToKz>[0]);
      const fromKzCol = columns.find((c) => c.cards.some((card) => card.number === cardNumber));
      if (fromKzCol && kzToUi(fromKzCol.title) === toUiColumn) return;
      logWork("card-move", { cardNumber, title: cardTitle, label: cardLabel, to: toKzColumn });
      void moveCard(cardNumber, toKzColumn).catch(() => {});
    }
  }

  const staleHours = data?.fileModified
    ? Math.round((Date.now() - new Date(data.fileModified).getTime()) / 3600000)
    : 0;

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
          flexDirection: "column",
          height: "100vh",
          width: "100vw",
          overflow: "hidden",
          background: "var(--bg)",
        }}
      >
        {/* ── Header ── */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border)",
            padding: "0.55rem 1.2rem",
            flexShrink: 0,
            background: "var(--bg-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span
              style={{
                fontFamily: "var(--font-inter), Inter, sans-serif",
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink)",
              }}
            >
              ModusDaily
            </span>
            {/* Layout toggle */}
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => router.push("/")}
                style={{
                  padding: "0.25rem 0.7rem",
                  border: "none",
                  background: "transparent",
                  color: "var(--ink-faint)",
                  fontFamily: "var(--font-inter), Inter, sans-serif",
                  fontSize: "0.62rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  letterSpacing: "0.05em",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-faint)")}
              >
                Dashboard
              </button>
              <button
                type="button"
                style={{
                  padding: "0.25rem 0.7rem",
                  border: "none",
                  borderLeft: "1px solid var(--border)",
                  background: "var(--accent-dim)",
                  color: "var(--accent)",
                  fontFamily: "var(--font-inter), Inter, sans-serif",
                  fontSize: "0.62rem",
                  fontWeight: 600,
                  cursor: "default",
                  letterSpacing: "0.05em",
                }}
              >
                Notebook
              </button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {config && <DayTypeBadge config={config} onClick={onPickDay} />}
            <SkinSwitcher />
          </div>
        </header>

        {/* ── Two-page body ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

          {/* ── Left page: The Day ── */}
          {!leftCollapsed && (
            <aside
              style={{
                width: resize.leftWidth,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                background: "var(--bg-card)",
                borderRight: "none",
              }}
            >
              {/* Page label */}
              <div
                style={{
                  padding: "0.5rem 1.6rem 0",
                  fontFamily: "var(--font-inter), Inter, sans-serif",
                  fontSize: "0.55rem",
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--ink-faint)",
                }}
              >
                The Day
              </div>

              {/* Clock + next event */}
              <ClockPanel events={liveCalendar.events} />

              {/* Briefing sections — collapsible, scrollable */}
              <div style={{ flex: 1, overflowY: "auto", padding: "0 0.75rem 1rem" }}>
                {loading && (
                  <div style={{ padding: "0.5rem 0.8rem", fontSize: "0.7rem", color: "var(--ink-faint)", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
                    Loading…
                  </div>
                )}
                {data && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {staleHours > 4 && (
                      <div style={{ borderRadius: 8, background: "rgba(197,160,40,0.08)", border: "1px solid rgba(197,160,40,0.25)", padding: "0.3rem 0.7rem", fontSize: "0.65rem", color: "#C5A028", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
                        Briefing is {staleHours}h old
                      </div>
                    )}
                    {data.bigDayBanner && (
                      <div style={{ borderRadius: 8, border: "1px solid var(--accent-dim)", background: "rgba(13,107,63,0.04)", padding: "0.6rem 0.75rem", fontSize: "0.8rem", color: "var(--ink)", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
                        {data.bigDayBanner}
                      </div>
                    )}
                    <CalendarSection events={liveCalendar.events} onRefresh={liveCalendar.refresh} />
                    <BriefingPanel data={data} />
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* ── Resize / collapse handle ── */}
          <div
            style={{
              width: 10,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: leftCollapsed ? "default" : "col-resize",
              background: "var(--bg)",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Seam line */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderLeft: "1px solid var(--border)",
                borderRight: "1px solid var(--border)",
              }}
              onPointerDown={leftCollapsed ? undefined : resize.onPointerDown}
            />
            {/* Collapse toggle */}
            <button
              type="button"
              onClick={() => setLeftCollapsed((v) => !v)}
              title={leftCollapsed ? "Expand day panel" : "Collapse day panel"}
              style={{
                position: "relative",
                zIndex: 2,
                width: 20,
                height: 28,
                borderRadius: 4,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--ink-faint)",
                fontSize: "0.55rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "border-color 0.15s, color 0.15s",
                padding: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--ink-faint)"; }}
            >
              {leftCollapsed ? "▶" : "◀"}
            </button>
          </div>

          {/* ── Right page: The Work ── */}
          <section
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              background: "var(--bg)",
            }}
          >
            {/* Page label */}
            <div
              style={{
                padding: "0.5rem 1.2rem 0",
                fontFamily: "var(--font-inter), Inter, sans-serif",
                fontSize: "0.55rem",
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
              }}
            >
              The Work
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              {/* Active card */}
              <div style={{ padding: "0.75rem 1.2rem 0" }}>
                <ActiveCard />
              </div>

              {/* Dial */}
              <LuxeDial />

              {/* Now / Next / Walk tally */}
              <NowNextList onOpenKanban={() => setDrawerOpen(true)} />
            </div>
          </section>
        </div>
      </main>

      {/* Drag overlay ghost */}
      <DragOverlay dropAnimation={null}>
        {draggedCard ? (
          <div
            style={{
              width: 240,
              borderRadius: 10,
              border: "1.5px solid var(--accent)",
              background: "var(--bg-card)",
              padding: "0.5rem 0.75rem",
              boxShadow: "0 8px 32px rgba(13,107,63,0.15)",
            }}
          >
            {draggedCard.label && (
              <div style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: "0.55rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.15rem" }}>
                {draggedCard.label}
              </div>
            )}
            <div style={{ fontSize: "0.78rem", color: "var(--ink)", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
              {draggedCard.title}
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {/* Kanban drawer */}
      <KanbanDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </DndContext>
  );
}
