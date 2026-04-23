"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "idle" | "work" | "shortBreak" | "longBreak";

const DURATIONS: Record<Exclude<Mode, "idle">, number> = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

type ModeStyle = { ring: string; halo: string; label: string };

const MODE_STYLES: Record<Mode, ModeStyle> = {
  idle: { ring: "#475569", halo: "#64748b", label: "Ready" },
  work: { ring: "#3b5bdb", halo: "#60a5fa", label: "Focus" },
  shortBreak: { ring: "#10b981", halo: "#34d399", label: "Break" },
  longBreak: { ring: "#059669", halo: "#34d399", label: "Long Break" },
};

const POMOS_PER_LONG_BREAK = 4;

/** SVG geometry — large dial suitable for a dedicated 4K display. */
const VIEWBOX = 520;
const CENTER = VIEWBOX / 2;
const RADIUS = 240;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TRACK_WIDTH = 14;
const STROKE_WIDTH = 22;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function PomodoroDial() {
  const [mode, setMode] = useState<Mode>("idle");
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DURATIONS.work);
  const [completed, setCompleted] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist across reloads — but ONLY restore truly active sessions.
  // Restoring stale paused/idle state from prior testing was confusing the dial.
  const RESTORE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
  useEffect(() => {
    try {
      const raw = localStorage.getItem("modusdaily:timer");
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        mode: Mode;
        timeLeft: number;
        completed: number;
        savedAt: number;
        running: boolean;
      };
      // Only restore RUNNING sessions, recent enough to still be relevant.
      if (!saved.running) return;
      if (Date.now() - saved.savedAt > RESTORE_WINDOW_MS) return;

      const elapsed = Math.floor((Date.now() - saved.savedAt) / 1000);
      const nextTime = Math.max(0, saved.timeLeft - elapsed);
      if (nextTime <= 0) return; // Already expired — let user start fresh.

      setMode(saved.mode);
      setCompleted(saved.completed);
      setTimeLeft(nextTime);
      setRunning(true);
    } catch {
      /* ignore corrupt state */
    }
  }, []);

  // Persist only when actually running, so paused/idle state doesn't get
  // restored next session and confuse the dial.
  useEffect(() => {
    try {
      if (running) {
        localStorage.setItem(
          "modusdaily:timer",
          JSON.stringify({
            mode,
            timeLeft,
            completed,
            savedAt: Date.now(),
            running,
          })
        );
      } else {
        localStorage.removeItem("modusdaily:timer");
      }
    } catch {
      /* ignore */
    }
  }, [mode, timeLeft, completed, running]);

  // Tick
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // Completion — schedule mode transition on next tick.
          queueMicrotask(() => handleCompletion());
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function handleCompletion() {
    setRunning(false);
    if (mode === "work") {
      const next = completed + 1;
      setCompleted(next);
      const nextMode: Mode =
        next > 0 && next % POMOS_PER_LONG_BREAK === 0
          ? "longBreak"
          : "shortBreak";
      setMode(nextMode);
      setTimeLeft(DURATIONS[nextMode]);
    } else {
      setMode("work");
      setTimeLeft(DURATIONS.work);
    }
    // TODO: audio cue + visible takeover for break. Not letting this be ignorable is the whole point.
  }

  function startFocus() {
    if (mode === "idle") {
      setMode("work");
      setTimeLeft(DURATIONS.work);
    }
    setRunning(true);
  }
  function pause() {
    setRunning(false);
  }
  function reset() {
    setRunning(false);
    if (mode === "idle") {
      setTimeLeft(DURATIONS.work);
    } else {
      setTimeLeft(DURATIONS[mode]);
    }
  }
  function skip() {
    setTimeLeft(0);
    handleCompletion();
  }

  const totalForMode =
    mode === "idle" ? DURATIONS.work : DURATIONS[mode];
  const progress = totalForMode > 0 ? timeLeft / totalForMode : 0;
  const dashoffset = useMemo(
    () => CIRCUMFERENCE * (1 - progress),
    [progress]
  );

  const style = MODE_STYLES[mode];

  // "Near done" intensifies the glow in the last 90 seconds of a focus block.
  const intensify = running && timeLeft > 0 && timeLeft <= 90;

  return (
    <div className="relative flex flex-col items-center gap-12">
      {/* Mode label */}
      <div
        className="text-sm uppercase tracking-[0.4em] transition-colors duration-1000"
        style={{ color: style.halo }}
      >
        {style.label}
      </div>

      {/* The dial */}
      <div className="relative">
        {/* Ambient halo */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full blur-3xl transition-all duration-1000"
          style={{
            background: `radial-gradient(circle, ${style.halo}33 0%, transparent 65%)`,
            opacity: running ? (intensify ? 0.9 : 0.6) : 0.25,
            transform: `scale(${running ? (intensify ? 1.15 : 1.05) : 1})`,
          }}
        />

        <svg
          width="720"
          height="720"
          viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
          className="relative drop-shadow-2xl"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="#1e293b"
            strokeWidth={TRACK_WIDTH}
          />
          {/* Progress ring */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={style.ring}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            style={{
              transition:
                "stroke 1.2s ease, stroke-dashoffset 1s linear, filter 1s ease",
              filter: running
                ? `drop-shadow(0 0 ${intensify ? 18 : 10}px ${style.halo})`
                : "none",
            }}
          />
        </svg>

        {/* Interior readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="font-light tabular-nums"
            style={{
              fontSize: "9rem",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "#f1f5f9",
            }}
          >
            {formatTime(timeLeft)}
          </div>
          <div className="mt-6 flex gap-2">
            {Array.from({ length: POMOS_PER_LONG_BREAK }).map((_, i) => (
              <span
                key={i}
                className="h-3 w-3 rounded-full transition-colors duration-500"
                style={{
                  background:
                    i < completed % POMOS_PER_LONG_BREAK
                      ? style.halo
                      : "#334155",
                }}
              />
            ))}
          </div>
          <div className="mt-4 text-xs uppercase tracking-[0.3em] text-slate-500">
            {completed} pomodoros today
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {!running ? (
          <button
            onClick={startFocus}
            className="rounded-full border border-slate-700 bg-slate-900/60 px-8 py-3 text-lg font-medium text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-800"
          >
            {mode === "idle" ? "Start focus" : "Resume"}
          </button>
        ) : (
          <button
            onClick={pause}
            className="rounded-full border border-slate-700 bg-slate-900/60 px-8 py-3 text-lg font-medium text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-800"
          >
            Pause
          </button>
        )}
        <button
          onClick={reset}
          className="rounded-full px-6 py-3 text-sm uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-100"
        >
          Reset
        </button>
        <button
          onClick={skip}
          className="rounded-full px-6 py-3 text-sm uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-100"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
