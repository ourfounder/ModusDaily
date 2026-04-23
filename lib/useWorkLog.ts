"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Work event logger — the foundation for Jimognostics.
 *
 * Records timestamped events throughout the day:
 * - card-move: card moved between columns (context switch, completion, etc.)
 * - pomo-complete: a work pomodoro finished
 * - break-complete: a break finished (with walk yes/no)
 * - day-type: which day type was selected
 * - active-switch: the In Progress card changed (context switch signal)
 *
 * Stored per-day in localStorage. Weekly/monthly data can be
 * aggregated for the Jimognostics dashboard.
 */

export type WorkEventType =
  | "card-move"
  | "pomo-complete"
  | "break-complete"
  | "day-type"
  | "active-switch";

export type WorkEvent = {
  t: string; // ISO timestamp
  type: WorkEventType;
  data: Record<string, string | number | boolean>;
};

export type DaySummary = {
  date: string;
  dayType: string | null;
  pomosCompleted: number;
  breaksCompleted: number;
  walksLogged: number;
  walksMissed: number;
  cardsCompleted: number;
  contextSwitches: number;
  projectsTouched: string[];
  events: WorkEvent[];
};

function dayKey(date?: Date): string {
  const d = date ?? new Date();
  return `modusdaily:worklog:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateFromKey(key: string): string {
  return key.replace("modusdaily:worklog:", "");
}

function loadDay(key: string): WorkEvent[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as WorkEvent[]) : [];
  } catch {
    return [];
  }
}

function saveDay(key: string, events: WorkEvent[]) {
  try {
    localStorage.setItem(key, JSON.stringify(events));
  } catch {
    /* storage full — silently drop */
  }
}

export function useWorkLog() {
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const key = dayKey();

  useEffect(() => {
    setEvents(loadDay(key));
  }, [key]);

  const log = useCallback(
    (type: WorkEventType, data: Record<string, string | number | boolean> = {}) => {
      const event: WorkEvent = { t: new Date().toISOString(), type, data };
      setEvents((prev) => {
        const next = [...prev, event];
        saveDay(key, next);
        return next;
      });
    },
    [key]
  );

  return { events, log };
}

/**
 * Read historical summaries for the Jimognostics dashboard.
 * Scans localStorage for worklog keys from the last N days.
 */
export function getRecentSummaries(days: number = 14): DaySummary[] {
  const summaries: DaySummary[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const events = loadDay(key);
    if (events.length === 0) continue;

    const date = dateFromKey(key);
    const dayTypeEvent = events.find((e) => e.type === "day-type");
    const pomos = events.filter((e) => e.type === "pomo-complete");
    const breaks = events.filter((e) => e.type === "break-complete");
    const walks = breaks.filter((e) => e.data.walked === true);
    const missedWalks = breaks.filter((e) => e.data.walked === false);
    const completions = events.filter(
      (e) => e.type === "card-move" && e.data.to === "Done"
    );
    const switches = events.filter((e) => e.type === "active-switch");

    // Unique projects touched (from card labels in moves and switches)
    const projects = new Set<string>();
    for (const e of events) {
      if (e.data.label && typeof e.data.label === "string") {
        projects.add(e.data.label);
      }
    }

    summaries.push({
      date,
      dayType: dayTypeEvent ? String(dayTypeEvent.data.dayType) : null,
      pomosCompleted: pomos.length,
      breaksCompleted: breaks.length,
      walksLogged: walks.length,
      walksMissed: missedWalks.length,
      cardsCompleted: completions.length,
      contextSwitches: switches.length,
      projectsTouched: Array.from(projects),
      events,
    });
  }

  return summaries;
}
