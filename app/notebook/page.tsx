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
import CompactKanban from "@/components/CompactKanban";
import ActiveCard from "@/components/ActiveCard";
import CalendarSection from "@/components/briefing/CalendarSection";
import BriefingPanel from "@/components/briefing/BriefingPanel";
import SkinSwitcher from "@/components/SkinSwitcher";
import { DayTypePicker, DayTypeBadge } from "@/components/DayTypeSelector";
import ClockPanel from "@/components/notebook/ClockPanel";
import LuxeDial from "@/components/notebook/LuxeDial";
import NowNextList from "@/components/notebook/NowNextList";
import { CardsProvider, useCardsContext } from "@/lib/CardsContext";
import { PomodoroProvider, usePomodoroContext } from "@/lib/PomodoroContext";
import { kzToUi, uiToKz, WAITING_KZ_COLUMN } from "@/lib/columnMapping";
import { useDayType } from "@/lib/useDayType";
import { useBriefing } from "@/lib/useBriefing";
import { useLiveCalendar } from "@/lib/useLiveCalendar";
import { useWorkLog } from "@/lib/useWorkLog";
import { useWalkLog } from "@/lib/useWalkLog";
import { POMOS_PER_LONG_BREAK } from "@/lib/usePomodoro";

// ── Resize helpers ───────────────────────────────────────────────────

function useResizePanel(storageKey: string, defaultW: number, min = 260, max = 580) {
  const [width, setWidth] = useState(defaultW);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setWidth(Math.max(min, Math.min(max, Number(raw))));
    } catch { /* ignore */ }
  }, [storageKey, min, max]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const next = Math.max(min, Math.min(max, Math.round(startW.current + (e.clientX - startX.current))));
      setWidth(next);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setWidth(w => { try { localStorage.setItem(storageKey, String(w)); } catch { /* ignore */ } return w; });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [storageKey, min, max]);

  return { width, onPointerDown };
}

// ── Panel handle — vertical label + collapse arrow ───────────────────

function PanelHandle({
  label, collapsed, onToggle, onPointerDown, side,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  side: "left" | "right";
}) {
  const arrow = side === "left"
    ? (collapsed ? "▶" : "◀")
    : (collapsed ? "◀" : "▶");

  return (
    <div
      style={{
        width: 22,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        borderLeft: side === "right" ? "1px solid var(--border)" : "none",
        borderRight: side === "left" ? "1px solid var(--border)" : "none",
        position: "relative",
        cursor: !collapsed && onPointerDown ? "col-resize" : "default",
        userSelect: "none",
      }}
      onPointerDown={!collapsed ? onPointerDown : undefined}
    >
      <button
        type="button"
        onClick={onToggle}
        title={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.5rem",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "0.6rem 0",
          color: "var(--ink-faint)",
          transition: "color 0.15s",
          position: "relative",
          zIndex: 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-faint)")}
      >
        <span style={{ fontSize: "0.5rem", lineHeight: 1 }}>{arrow}</span>
        <span
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontSize: "0.48rem",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontFamily: "var(--font-inter), Inter, sans-serif",
            lineHeight: 1,
          }}
        >
          {label}
        </span>
      </button>
    </div>
  );
}

// ── Stats bar ────────────────────────────────────────────────────────

function StatsBar() {
  const { completed } = usePomodoroContext();
  const { walkedCount, totalBreaks } = useWalkLog();

  // Show pomo dots: filled per completed, cycling through colors
  const cyclePos = completed % POMOS_PER_LONG_BREAK;
  const fullCycles = Math.floor(completed / POMOS_PER_LONG_BREAK);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "0.35rem 1rem",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-card)",
        flexShrink: 0,
        fontFamily: "var(--font-inter), Inter, sans-serif",
        minHeight: 32,
      }}
    >
      {/* Pomos */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
        {/* Completed full cycles as small stacked dots */}
        {fullCycles > 0 && (
          <span style={{ fontSize: "0.62rem", fontWeight: 600, color: "var(--work)", marginRight: "0.15rem" }}>
            {fullCycles}×
          </span>
        )}
        {/* Current cycle pips */}
        {Array.from({ length: POMOS_PER_LONG_BREAK }).map((_, i) => (
          <span
            key={i}
            style={{
              width: 8, height: 8, borderRadius: "50%", display: "inline-block",
              background: i < cyclePos ? "var(--work)" : "var(--border)",
              transition: "background 0.4s",
            }}
          />
        ))}
        <span style={{ fontSize: "0.62rem", color: "var(--ink-dim)", marginLeft: "0.25rem" }}>
          {completed} {completed === 1 ? "pomo" : "pomos"}
        </span>
      </div>

      <div style={{ width: 1, height: 16, background: "var(--border)" }} />

      {/* Walks */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
        {totalBreaks === 0 ? (
          <span style={{ fontSize: "0.62rem", color: "var(--ink-faint)" }}>no breaks yet</span>
        ) : (
          <>
            {Array.from({ length: Math.min(totalBreaks, 12) }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 8, height: 8, borderRadius: "50%", display: "inline-block",
                  background: i < walkedCount ? "var(--short-break)" : "var(--border)",
                  transition: "background 0.4s",
                }}
              />
            ))}
            {totalBreaks > 12 && (
              <span style={{ fontSize: "0.58rem", color: "var(--ink-faint)" }}>+{totalBreaks - 12}</span>
            )}
            <span style={{ fontSize: "0.62rem", color: "var(--ink-dim)", marginLeft: "0.2rem" }}>
              {walkedCount}/{totalBreaks} walks
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Page root ────────────────────────────────────────────────────────

export default function NotebookPage() {
  return (
    <CardsProvider>
      <PomodoroProvider>
        <NotebookShell />
      </PomodoroProvider>
    </CardsProvider>
  );
}

function NotebookShell() {
  const { config, needsSelection, select } = useDayType();
  const [showPicker, setShowPicker] = useState(false);
  const { log: logWork } = useWorkLog();

  if (needsSelection || showPicker) {
    return (
      <main style={{ display: "flex", height: "100vh", width: "100vw", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink)" }}>
            ModusDaily
          </div>
          <div style={{ marginTop: "0.3rem", fontSize: "0.6rem", color: "var(--ink-faint)" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>
        <DayTypePicker onSelect={(dt) => { select(dt); logWork("day-type", { dayType: dt }); setShowPicker(false); }} />
      </main>
    );
  }

  return <NotebookLayout config={config} onPickDay={() => setShowPicker(true)} />;
}

function NotebookLayout({
  config, onPickDay,
}: {
  config: ReturnType<typeof useDayType>["config"];
  onPickDay: () => void;
}) {
  const { columns, moveCard } = useCardsContext();
  const [dragCardNumber, setDragCardNumber] = useState<number | null>(null);
  const [briefingCollapsed, setBriefingCollapsed] = useState(false);
  const [kanbanCollapsed, setKanbanCollapsed] = useState(false);
  const [clockLarge, setClockLarge] = useState(true);
  const [dialLarge, setDialLarge] = useState(false);
  const { log: logWork } = useWorkLog();
  const router = useRouter();

  const briefingResize = useResizePanel("modusdaily:notebook:briefingWidth", 340, 240, 520);
  const kanbanResize = useResizePanel("modusdaily:notebook:kanbanWidth", 380, 280, 560);

  const { data, loading } = useBriefing();
  const liveCalendar = useLiveCalendar(data?.calendar ?? null);
  const staleHours = data?.fileModified
    ? Math.round((Date.now() - new Date(data.fileModified).getTime()) / 3600000)
    : 0;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
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

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragCardNumber(null)}>
      <main style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden", background: "var(--bg)" }}>

        {/* ── Header ── */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", padding: "0.5rem 1rem", flexShrink: 0, background: "var(--bg-card)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
            <span style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink)" }}>
              ModusDaily
            </span>
            <div style={{ display: "flex", borderRadius: 7, overflow: "hidden", border: "1px solid var(--border)" }}>
              <button type="button" onClick={() => router.push("/")}
                style={{ padding: "0.22rem 0.65rem", border: "none", background: "transparent", color: "var(--ink-faint)", fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: "0.6rem", fontWeight: 500, cursor: "pointer", transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-faint)")}>
                Dashboard
              </button>
              <button type="button"
                style={{ padding: "0.22rem 0.65rem", border: "none", borderLeft: "1px solid var(--border)", background: "var(--accent-dim)", color: "var(--accent)", fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: "0.6rem", fontWeight: 600, cursor: "default" }}>
                Notebook
              </button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {config && <DayTypeBadge config={config} onClick={onPickDay} />}
            <SkinSwitcher />
          </div>
        </header>

        {/* ── Three-panel body ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

          {/* BRIEFING panel */}
          {!briefingCollapsed && (
            <aside style={{ width: briefingResize.width, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-card)" }}>
              <div style={{ padding: "0.45rem 1.4rem 0", fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: "0.52rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
                The Day
              </div>
              <ClockPanel events={liveCalendar.events} large={clockLarge} onToggleSize={() => setClockLarge(v => !v)} />
              <div style={{ flex: 1, overflowY: "auto", padding: "0 0.65rem 1rem" }}>
                {loading && <div style={{ padding: "0.5rem 0.8rem", fontSize: "0.7rem", color: "var(--ink-faint)", fontFamily: "var(--font-inter), Inter, sans-serif" }}>Loading…</div>}
                {data && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {staleHours > 4 && (
                      <div style={{ borderRadius: 8, background: "rgba(197,160,40,0.08)", border: "1px solid rgba(197,160,40,0.25)", padding: "0.28rem 0.65rem", fontSize: "0.62rem", color: "#C5A028", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
                        Briefing is {staleHours}h old
                      </div>
                    )}
                    {data.bigDayBanner && (
                      <div style={{ borderRadius: 8, border: "1px solid var(--accent-dim)", background: "rgba(13,107,63,0.04)", padding: "0.5rem 0.65rem", fontSize: "0.78rem", color: "var(--ink)", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
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

          {/* BRIEFING handle */}
          <PanelHandle
            label="Briefing"
            collapsed={briefingCollapsed}
            onToggle={() => setBriefingCollapsed(v => !v)}
            onPointerDown={briefingResize.onPointerDown}
            side="left"
          />

          {/* CENTER: The Work */}
          <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>
            {/* Section label row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.45rem 1rem 0", flexShrink: 0 }}>
              <span style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: "0.52rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
                The Work
              </span>
            </div>

            {/* Stats bar */}
            <StatsBar />

            {/* Scrollable work content */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "0.65rem 1rem 0" }}>
                <ActiveCard />
              </div>
              <LuxeDial large={dialLarge} onToggleSize={() => setDialLarge(v => !v)} />
              <NowNextList />
            </div>
          </section>

          {/* KANBAN handle */}
          <PanelHandle
            label="Kanban"
            collapsed={kanbanCollapsed}
            onToggle={() => setKanbanCollapsed(v => !v)}
            onPointerDown={kanbanResize.onPointerDown}
            side="right"
          />

          {/* KANBAN panel */}
          {!kanbanCollapsed && (
            <aside style={{ width: kanbanResize.width, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-card)" }}>
              <div style={{ padding: "0.45rem 1rem 0", fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: "0.52rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-faint)", flexShrink: 0 }}>
                Kanban
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <CompactKanban />
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* Drag ghost */}
      <DragOverlay dropAnimation={null}>
        {draggedCard ? (
          <div style={{ width: 220, borderRadius: 10, border: "1.5px solid var(--accent)", background: "var(--bg-card)", padding: "0.45rem 0.7rem", boxShadow: "0 8px 32px rgba(13,107,63,0.15)" }}>
            {draggedCard.label && (
              <div style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: "0.52rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.1rem" }}>
                {draggedCard.label}
              </div>
            )}
            <div style={{ fontSize: "0.78rem", color: "var(--ink)", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
              {draggedCard.title}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
