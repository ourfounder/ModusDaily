"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PomodoroMode = "idle" | "work" | "shortBreak" | "longBreak";

export const POMODORO_DURATIONS: Record<
  Exclude<PomodoroMode, "idle">,
  number
> = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export const POMOS_PER_LONG_BREAK = 4;

export type PomodoroState = {
  mode: PomodoroMode;
  running: boolean;
  timeLeft: number;
  completed: number;
  /** seconds in the current mode's full cycle (or default work cycle if idle) */
  totalForMode: number;
  /** 0..1 of the current cycle remaining */
  progress: number;
  /** true when in the last 90s of an active focus block — UIs can intensify */
  intensify: boolean;
};

export type PomodoroActions = {
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
};

const STORAGE_KEY = "modusdaily:timer";
const RESTORE_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * Single source of truth for the pomodoro timer.
 *
 * Both the operational ("ops display") and Ming variants of ModusDaily
 * consume this hook so the timer behaves identically — only presentation
 * differs.
 *
 * Persistence rules: only running sessions (less than 2 hours old) survive
 * a reload. Paused or idle states are deliberately dropped.
 */
export function usePomodoro(): PomodoroState & PomodoroActions {
  const [mode, setMode] = useState<PomodoroMode>("idle");
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(POMODORO_DURATIONS.work);
  const [completed, setCompleted] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Wall-clock ms when the timer should hit zero. Null when not running. */
  const deadlineRef = useRef<number | null>(null);

  // Restore (running sessions only, recent only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        mode: PomodoroMode;
        deadline: number;
        completed: number;
        running: boolean;
      };
      if (!saved.running) return;
      if (saved.deadline - Date.now() > RESTORE_WINDOW_MS) return;
      const remaining = Math.floor((saved.deadline - Date.now()) / 1000);
      if (remaining <= 0) return;
      setMode(saved.mode);
      setCompleted(saved.completed);
      setTimeLeft(remaining);
      deadlineRef.current = saved.deadline;
      setRunning(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Persist while running; clear on stop.
  useEffect(() => {
    try {
      if (running && deadlineRef.current) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            mode,
            deadline: deadlineRef.current,
            completed,
            running,
          })
        );
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [mode, timeLeft, completed, running]);

  // Tick — computes timeLeft from wall-clock deadline, immune to tab throttling
  useEffect(() => {
    if (!running || !deadlineRef.current) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.round((deadlineRef.current! - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
      if (remaining <= 0) {
        queueMicrotask(() => handleCompletion());
      }
    };
    // Tick immediately on focus restore (catches up after background)
    tick();
    intervalRef.current = setInterval(tick, 1000);
    const onVisibility = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function handleCompletion() {
    setRunning(false);
    deadlineRef.current = null;
    if (mode === "work") {
      const next = completed + 1;
      setCompleted(next);
      const nextMode: PomodoroMode =
        next > 0 && next % POMOS_PER_LONG_BREAK === 0
          ? "longBreak"
          : "shortBreak";
      setMode(nextMode);
      setTimeLeft(POMODORO_DURATIONS[nextMode]);
    } else {
      setMode("work");
      setTimeLeft(POMODORO_DURATIONS.work);
    }
  }

  function start() {
    let duration: number;
    if (mode === "idle") {
      setMode("work");
      duration = POMODORO_DURATIONS.work;
      setTimeLeft(duration);
    } else {
      duration = timeLeft;
    }
    deadlineRef.current = Date.now() + duration * 1000;
    setRunning(true);
  }
  function pause() {
    setRunning(false);
    deadlineRef.current = null;
  }
  function reset() {
    setRunning(false);
    deadlineRef.current = null;
    setTimeLeft(
      mode === "idle" ? POMODORO_DURATIONS.work : POMODORO_DURATIONS[mode]
    );
  }
  function skip() {
    deadlineRef.current = null;
    setTimeLeft(0);
    handleCompletion();
  }

  const totalForMode =
    mode === "idle" ? POMODORO_DURATIONS.work : POMODORO_DURATIONS[mode];
  const progress = totalForMode > 0 ? timeLeft / totalForMode : 0;
  const intensify = running && timeLeft > 0 && timeLeft <= 90;

  // ── Tab title: show countdown when running ──
  useEffect(() => {
    if (running && timeLeft > 0) {
      const modeLabel =
        mode === "work" ? "Focus" : mode === "shortBreak" ? "Break" : "Long Break";
      document.title = `${formatPomodoroTime(timeLeft)} · ${modeLabel} — ModusDaily`;
    } else if (mode !== "idle" && timeLeft === 0) {
      const label = mode === "work" ? "Break time!" : "Ready to focus";
      document.title = `✓ ${label} — ModusDaily`;
    } else {
      document.title = "ModusDaily";
    }
  }, [timeLeft, running, mode]);

  // ── Pleasant chime on completion ──
  const playChime = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      // Singing-bowl style: two harmonically related tones with slow decay
      const frequencies = [528, 396, 264]; // C5, G4, C4 — consonant overtones
      const now = ctx.currentTime;

      for (let i = 0; i < frequencies.length; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = frequencies[i];
        // Stagger entries slightly for a natural chime feel
        const onset = now + i * 0.15;
        gain.gain.setValueAtTime(0, onset);
        gain.gain.linearRampToValueAtTime(0.15 / (i + 1), onset + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, onset + 3.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(onset);
        osc.stop(onset + 4);
      }
      // Clean up after sounds finish
      setTimeout(() => ctx.close(), 5000);
    } catch {
      /* Web Audio not available — silent fallback */
    }
  }, []);

  const prevRunningRef = useRef(running);
  useEffect(() => {
    // Chime when timer transitions from running to stopped (completion)
    if (prevRunningRef.current && !running && mode !== "idle") {
      playChime();
    }
    prevRunningRef.current = running;
  }, [running, mode, playChime]);

  return {
    mode,
    running,
    timeLeft,
    completed,
    totalForMode,
    progress,
    intensify,
    start,
    pause,
    reset,
    skip,
  };
}

export function formatPomodoroTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
