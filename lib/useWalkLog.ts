"use client";

import { useState, useCallback, useEffect } from "react";

export type WalkRecord = {
  time: string; // ISO timestamp
  walked: boolean;
  breakType: "short" | "long";
};

function todayKey(): string {
  const d = new Date();
  return `modusdaily:walks:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadToday(): WalkRecord[] {
  try {
    const raw = localStorage.getItem(todayKey());
    return raw ? (JSON.parse(raw) as WalkRecord[]) : [];
  } catch {
    return [];
  }
}

function saveToday(records: WalkRecord[]) {
  try {
    localStorage.setItem(todayKey(), JSON.stringify(records));
  } catch {
    /* ignore */
  }
}

export function useWalkLog() {
  const [records, setRecords] = useState<WalkRecord[]>([]);

  // Load on mount
  useEffect(() => {
    setRecords(loadToday());
  }, []);

  const log = useCallback((walked: boolean, breakType: "short" | "long") => {
    const entry: WalkRecord = {
      time: new Date().toISOString(),
      walked,
      breakType,
    };
    setRecords((prev) => {
      const next = [...prev, entry];
      saveToday(next);
      return next;
    });
  }, []);

  const walkedCount = records.filter((r) => r.walked).length;
  const totalBreaks = records.length;

  return { records, log, walkedCount, totalBreaks };
}
