"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import {
  POMOS_PER_LONG_BREAK,
  formatPomodoroTime,
  type PomodoroMode,
} from "@/lib/usePomodoro";
import { usePomodoroContext } from "@/lib/PomodoroContext";
import { useWalkLog } from "@/lib/useWalkLog";
import { useWorkLog } from "@/lib/useWorkLog";

const SIZE_NORMAL = 220;
const SIZE_LARGE = 300;
const R_NORMAL = 92;
const R_LARGE = 126;

type ModeConfig = { stroke: string; glow: string; label: string };

const MODE: Record<PomodoroMode, ModeConfig> = {
  idle:       { stroke: "#9CA3AF", glow: "transparent",           label: "Ready" },
  work:       { stroke: "#0D6B3F", glow: "rgba(13,107,63,0.35)",  label: "Working" },
  shortBreak: { stroke: "#1A72B0", glow: "rgba(26,114,176,0.3)",  label: "Short break" },
  longBreak:  { stroke: "#6352A8", glow: "rgba(99,82,168,0.3)",   label: "Long break" },
};

function CtrlButton({
  onClick,
  children,
  primary,
}: {
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: primary ? "0.5rem 1.6rem" : "0.4rem 0.9rem",
        borderRadius: 99,
        border: primary ? "1.5px solid var(--accent)" : "1px solid var(--border)",
        background: primary ? "rgba(13,107,63,0.07)" : "transparent",
        color: primary ? "var(--accent)" : "var(--ink-dim)",
        fontFamily: "var(--font-inter), Inter, sans-serif",
        fontSize: "0.75rem",
        fontWeight: primary ? 600 : 400,
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s, color 0.15s",
        letterSpacing: "0.01em",
      }}
      onMouseEnter={(e) => {
        if (primary) {
          e.currentTarget.style.background = "rgba(13,107,63,0.14)";
        } else {
          e.currentTarget.style.color = "var(--ink)";
          e.currentTarget.style.borderColor = "var(--ink-faint)";
        }
      }}
      onMouseLeave={(e) => {
        if (primary) {
          e.currentTarget.style.background = "rgba(13,107,63,0.07)";
        } else {
          e.currentTarget.style.color = "var(--ink-dim)";
          e.currentTarget.style.borderColor = "var(--border)";
        }
      }}
    >
      {children}
    </button>
  );
}

export default function LuxeDial({ large = false, onToggleSize }: { large?: boolean; onToggleSize?: () => void }) {
  const SIZE = large ? SIZE_LARGE : SIZE_NORMAL;
  const CX = SIZE / 2;
  const R = large ? R_LARGE : R_NORMAL;
  const CIRC = 2 * Math.PI * R;

  const t = usePomodoroContext();
  const m = MODE[t.mode];
  const dashoffset = useMemo(() => CIRC * (1 - t.progress), [CIRC, t.progress]);

  const { log: logWalk, walkedCount, totalBreaks } = useWalkLog();
  const { log: logWork } = useWorkLog();
  const [walkPrompt, setWalkPrompt] = useState<"short" | "long" | null>(null);
  const prevMode = useRef<PomodoroMode>(t.mode);

  useEffect(() => {
    const prev = prevMode.current;
    prevMode.current = t.mode;
    if ((t.mode === "shortBreak" || t.mode === "longBreak") && prev === "work") {
      logWork("pomo-complete", { completed: t.completed });
    }
    if (t.mode === "work" && !t.running && (prev === "shortBreak" || prev === "longBreak")) {
      setWalkPrompt(prev === "shortBreak" ? "short" : "long");
    }
  }, [t.mode, t.running, t.completed, logWork]);

  function answerWalk(walked: boolean) {
    if (walkPrompt) {
      logWalk(walked, walkPrompt);
      logWork("break-complete", { walked, breakType: walkPrompt });
    }
    setWalkPrompt(null);
  }

  const primaryLabel =
    t.mode === "idle" ? "Begin" :
    t.mode === "shortBreak" && !t.running ? "Start Break" :
    t.mode === "longBreak" && !t.running ? "Start Break" :
    t.mode === "shortBreak" ? "Take a break" :
    t.mode === "longBreak" ? "Long break" :
    !t.running ? "Resume" :
    "Pause";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.2rem",
        padding: "0.5rem 1.2rem 0",
      }}
    >
      {/* Dial */}
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>
        {/* Ambient glow behind SVG */}
        {t.running && (
          <div
            style={{
              position: "absolute",
              inset: -20,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${m.glow} 0%, transparent 65%)`,
              filter: "blur(18px)",
              pointerEvents: "none",
              transition: "background 1.2s ease",
            }}
          />
        )}

        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{
            position: "relative",
            transform: "rotate(-90deg)",
            filter: t.running ? `drop-shadow(0 0 6px ${m.glow})` : "none",
            transition: "filter 1s ease",
          }}
        >
          {/* Track */}
          <circle cx={CX} cy={CX} r={R} fill="none" stroke="var(--border)" strokeWidth={3} />

          {/* Progress arc */}
          <circle
            cx={CX} cy={CX} r={R}
            fill="none"
            stroke={m.stroke}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={dashoffset}
            style={{
              transition: "stroke 0.8s ease, stroke-dashoffset 1s linear",
              opacity: t.running ? 1 : 0.6,
            }}
          />
        </svg>

        {/* Center readout */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.1rem",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-inter), Inter, sans-serif",
              fontSize: "0.6rem",
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: m.stroke,
              opacity: 0.8,
              transition: "color 0.8s ease",
            }}
          >
            {m.label}
          </div>
          <div
            style={{
              fontFamily: "var(--font-inter), Inter, sans-serif",
              fontSize: "3.4rem",
              fontWeight: 300,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              color: "var(--ink)",
            }}
          >
            {formatPomodoroTime(t.timeLeft)}
          </div>
          {/* Pomo pips */}
          <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.5rem" }}>
            {Array.from({ length: POMOS_PER_LONG_BREAK }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: i < t.completed % POMOS_PER_LONG_BREAK ? m.stroke : "var(--border)",
                  display: "inline-block",
                  transition: "background 0.5s ease",
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontFamily: "var(--font-inter), Inter, sans-serif",
              fontSize: "0.58rem",
              color: "var(--ink-faint)",
              marginTop: "0.35rem",
            }}
          >
            {t.completed} {t.completed === 1 ? "pomo" : "pomos"} today
          </div>
        </div>

        {/* Walk prompt overlay */}
        {walkPrompt && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.6rem",
              background: "rgba(244, 247, 245, 0.94)",
              borderRadius: "50%",
              backdropFilter: "blur(6px)",
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
              Break over
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 400, color: "var(--ink)", textAlign: "center", maxWidth: 160, lineHeight: 1.4, fontFamily: "var(--font-inter), Inter, sans-serif" }}>
              Did you get up and walk?
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
              <button type="button" onClick={() => answerWalk(true)}
                style={{ padding: "0.35rem 1rem", borderRadius: 99, border: "1.5px solid var(--work)", background: "rgba(13,107,63,0.07)", color: "var(--work)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
                Yes
              </button>
              <button type="button" onClick={() => answerWalk(false)}
                style={{ padding: "0.35rem 1rem", borderRadius: 99, border: "1px solid var(--border)", background: "transparent", color: "var(--ink-dim)", fontSize: "0.75rem", cursor: "pointer", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
                No
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {!t.running ? (
          <CtrlButton primary onClick={t.start}>{primaryLabel}</CtrlButton>
        ) : (
          <CtrlButton primary onClick={t.pause}>Pause</CtrlButton>
        )}
        <CtrlButton onClick={t.reset}>Reset</CtrlButton>
        <CtrlButton onClick={t.skip}>Skip</CtrlButton>
        {onToggleSize && (
          <CtrlButton onClick={onToggleSize}>{large ? "▼" : "▲"}</CtrlButton>
        )}
      </div>
    </div>
  );
}
