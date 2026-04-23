"use client";

import { useCallback, useEffect, useState } from "react";

export type DayType = "deep-work" | "meeting-day" | "recovery" | "sprint" | "context-mania";

export type DayTypeConfig = {
  id: DayType;
  label: string;
  description: string;
  emoji: string;
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  accent: string; // tailwind-compatible color token
};

export const DAY_TYPES: DayTypeConfig[] = [
  {
    id: "deep-work",
    label: "Deep Work",
    description: "Long uninterrupted blocks. Few meetings.",
    emoji: "\u{1F9D8}", // 🧘
    workMinutes: 50,
    shortBreakMinutes: 10,
    longBreakMinutes: 20,
    accent: "blue",
  },
  {
    id: "meeting-day",
    label: "Meeting Day",
    description: "Standard pomos between calls.",
    emoji: "\u{1F4DE}", // 📞
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    accent: "amber",
  },
  {
    id: "recovery",
    label: "Recovery",
    description: "Short bursts, longer rest. Low-energy day.",
    emoji: "\u{1F331}", // 🌱
    workMinutes: 15,
    shortBreakMinutes: 10,
    longBreakMinutes: 20,
    accent: "teal",
  },
  {
    id: "sprint",
    label: "Sprint",
    description: "Urgent deadlines. Shorter breaks, longer focus.",
    emoji: "\u{26A1}", // ⚡
    workMinutes: 35,
    shortBreakMinutes: 5,
    longBreakMinutes: 10,
    accent: "rose",
  },
  {
    id: "context-mania",
    label: "Context Mania",
    description: "Bouncing between projects. Short pomos, frequent resets.",
    emoji: "\u{1F300}", // 🌀
    workMinutes: 20,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    accent: "violet",
  },
];

const STORAGE_KEY = "modusdaily:dayType";
const DATE_KEY = "modusdaily:dayTypeDate";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useDayType() {
  const [selected, setSelected] = useState<DayType | null>(null);
  const [needsSelection, setNeedsSelection] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as DayType | null;
    const storedDate = localStorage.getItem(DATE_KEY);
    if (stored && storedDate === today()) {
      setSelected(stored);
      setNeedsSelection(false);
    } else {
      setNeedsSelection(true);
    }
  }, []);

  const select = useCallback((dt: DayType) => {
    setSelected(dt);
    setNeedsSelection(false);
    localStorage.setItem(STORAGE_KEY, dt);
    localStorage.setItem(DATE_KEY, today());
  }, []);

  const config = selected
    ? DAY_TYPES.find((d) => d.id === selected) ?? null
    : null;

  return { selected, config, needsSelection, select, allTypes: DAY_TYPES };
}
