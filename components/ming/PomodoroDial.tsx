"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import {
  POMOS_PER_LONG_BREAK,
  formatPomodoroTime,
  usePomodoro,
  type PomodoroMode,
} from "@/lib/usePomodoro";
import { useWalkLog } from "@/lib/useWalkLog";
import { useWorkLog } from "@/lib/useWorkLog";

/**
 * Ming chronograph — brass on dark velvet.
 *
 * Brighter ticks, more visible buttons, warm glow.
 * The dial is a timepiece, not a ghost.
 */

const VIEWBOX = 520;
const CENTER = VIEWBOX / 2;
const RADIUS = 232;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TRACK_WIDTH = 2.5;
const STROKE_WIDTH = 8;
const TICK_OUTER = 248;
const TICK_INNER = 239;
const TICK_INNER_MAJOR = 232;

type ModeStyle = { ring: string; halo: string; label: string };

const MODE_STYLES: Record<PomodoroMode, ModeStyle> = {
  idle: { ring: "#9a6e2e", halo: "#c48a3c", label: "Resting" },
  work: { ring: "#d4993f", halo: "#e0a84a", label: "At Work" },
  shortBreak: { ring: "#9aad78", halo: "#b6c594", label: "A Pause" },
  longBreak: { ring: "#7bb5a0", halo: "#94c5b6", label: "A Long Pause" },
};

function Ticks({ color }: { color: string }) {
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * 2 * Math.PI;
    const isMajor = i % 5 === 0;
    const innerR = isMajor ? TICK_INNER_MAJOR : TICK_INNER;
    const outerR = TICK_OUTER;
    const x1 = CENTER + Math.cos(angle) * innerR;
    const y1 = CENTER + Math.sin(angle) * innerR;
    const x2 = CENTER + Math.cos(angle) * outerR;
    const y2 = CENTER + Math.sin(angle) * outerR;
    ticks.push(
      <line
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color}
        strokeWidth={isMajor ? 2 : 0.8}
        opacity={isMajor ? 0.85 : 0.4}
      />
    );
  }
  return <g>{ticks}</g>;
}

export default function MingPomodoroDial() {
  const t = usePomodoro();
  const style = MODE_STYLES[t.mode];
  const dashoffset = useMemo(
    () => CIRCUMFERENCE * (1 - t.progress),
    [t.progress]
  );

  // ── Walk tracking: detect break→work transition ──
  const { log: logWalk, walkedCount, totalBreaks } = useWalkLog();
  const { log: logWork } = useWorkLog();
  const [walkPrompt, setWalkPrompt] = useState<"short" | "long" | null>(null);
  const prevModeRef = useRef<PomodoroMode>(t.mode);

  useEffect(() => {
    const prev = prevModeRef.current;
    prevModeRef.current = t.mode;
    // Work just ended → break mode
    if (
      (t.mode === "shortBreak" || t.mode === "longBreak") &&
      prev === "work"
    ) {
      logWork("pomo-complete", { completed: t.completed });
    }
    // Break just ended → work mode, timer not running (completion state)
    if (
      t.mode === "work" &&
      !t.running &&
      (prev === "shortBreak" || prev === "longBreak")
    ) {
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.8rem",
      }}
    >
      <div style={{ position: "relative", width: 600, height: 600 }}>
        {/* Warm bloom behind the dial */}
        <div
          style={{
            position: "absolute",
            inset: -40,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${style.halo}28 0%, transparent 58%)`,
            opacity: t.running ? (t.intensify ? 0.85 : 0.55) : 0.22,
            transform: `scale(${t.running ? (t.intensify ? 1.12 : 1.05) : 1})`,
            transition: "opacity 1.2s ease, transform 1.2s ease",
            pointerEvents: "none",
            filter: "blur(32px)",
          }}
        />

        <svg
          width="600"
          height="600"
          viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
          style={{ position: "relative", transform: "rotate(-90deg)" }}
        >
          {/* Track ring */}
          <circle
            cx={CENTER} cy={CENTER} r={RADIUS}
            fill="none" stroke="#3a2f22" strokeWidth={TRACK_WIDTH}
          />

          {/* Tick marks */}
          <Ticks color={style.halo} />

          {/* Progress arc */}
          <circle
            cx={CENTER} cy={CENTER} r={RADIUS}
            fill="none" stroke={style.ring} strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            style={{
              transition: "stroke 1.4s ease, stroke-dashoffset 1s linear, opacity 1s ease",
              opacity: t.running ? 1 : 0.7,
              filter: t.running ? `drop-shadow(0 0 6px ${style.halo}60)` : "none",
            }}
          />
        </svg>

        {/* Interior readout */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            color: "#e9dfce",
          }}
        >
          {/* Mode label — inside the dial, above the time */}
          <div
            style={{
              fontFamily: "Futura, 'Trebuchet MS', sans-serif",
              fontSize: "0.7rem",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              color: style.halo,
              opacity: 0.9,
              marginBottom: "0.8rem",
              transition: "color 1s ease",
            }}
          >
            {style.label}
          </div>

          <div
            className="ming-tabular"
            style={{
              fontFamily: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
              fontSize: "7.2rem",
              fontWeight: 400,
              lineHeight: 1,
              letterSpacing: "-0.01em",
              color: "var(--ink-faint)",
            }}
          >
            {formatPomodoroTime(t.timeLeft)}
          </div>

          {/* Pomodoro pips */}
          <div style={{ marginTop: "1.4rem", display: "flex", gap: "0.55rem" }}>
            {Array.from({ length: POMOS_PER_LONG_BREAK }).map((_, i) => (
              <span
                key={i}
                style={{
                  height: 8, width: 8, borderRadius: "50%",
                  background: i < t.completed % POMOS_PER_LONG_BREAK ? style.halo : "#3a2f22",
                  transition: "background 0.6s ease",
                }}
              />
            ))}
          </div>

          <div
            style={{
              marginTop: "0.8rem",
              fontFamily: "Futura, 'Trebuchet MS', sans-serif",
              fontSize: "0.6rem",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#8a7d6b",
            }}
          >
            {t.completed} {t.completed === 1 ? "vessel" : "vessels"} drawn today
          </div>

          {/* Walk tracker tally */}
          {totalBreaks > 0 && (
            <div
              style={{
                marginTop: "0.5rem",
                fontFamily: "Futura, 'Trebuchet MS', sans-serif",
                fontSize: "0.55rem",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: walkedCount > 0 ? "#9aad78" : "#8a7d6b",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <span>{walkedCount}/{totalBreaks} walks</span>
              <span style={{ display: "flex", gap: "0.2rem" }}>
                {Array.from({ length: totalBreaks }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: i < walkedCount ? "#9aad78" : "#3a2f22",
                    }}
                  />
                ))}
              </span>
            </div>
          )}
        </div>

        {/* ── Walk prompt overlay ── */}
        {walkPrompt && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(15, 13, 10, 0.88)",
              borderRadius: "50%",
              zIndex: 10,
            }}
          >
            <div
              style={{
                fontFamily: "Futura, 'Trebuchet MS', sans-serif",
                fontSize: "0.75rem",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#9aad78",
                marginBottom: "0.6rem",
              }}
            >
              Break Over
            </div>
            <div
              style={{
                fontFamily: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
                fontSize: "1.4rem",
                color: "#e9dfce",
                marginBottom: "1.8rem",
                textAlign: "center",
                maxWidth: 280,
                lineHeight: 1.4,
              }}
            >
              Did you get up and walk around?
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                type="button"
                onClick={() => answerWalk(true)}
                style={{
                  background: "rgba(154, 173, 120, 0.15)",
                  color: "#9aad78",
                  border: "1px solid #9aad78",
                  borderRadius: 4,
                  padding: "0.6rem 1.8rem",
                  fontFamily: "Futura, 'Trebuchet MS', sans-serif",
                  fontSize: "0.82rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(154, 173, 120, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(154, 173, 120, 0.15)";
                }}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => answerWalk(false)}
                style={{
                  background: "transparent",
                  color: "#8a7d6b",
                  border: "1px solid #3a2f22",
                  borderRadius: 4,
                  padding: "0.6rem 1.8rem",
                  fontFamily: "Futura, 'Trebuchet MS', sans-serif",
                  fontSize: "0.82rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#bfb49e";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#8a7d6b";
                }}
              >
                No
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls — more visible brass buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
        {!t.running ? (
          <button
            onClick={t.start}
            style={{
              background: "rgba(196, 138, 60, 0.12)",
              color: "#d4993f",
              border: "1px solid #9a6e2e",
              borderRadius: 4,
              padding: "0.6rem 1.6rem",
              fontFamily: "Futura, 'Trebuchet MS', sans-serif",
              fontSize: "0.82rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s, border-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(196, 138, 60, 0.25)";
              e.currentTarget.style.color = "#e9dfce";
              e.currentTarget.style.borderColor = "#c48a3c";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(196, 138, 60, 0.12)";
              e.currentTarget.style.color = "#d4993f";
              e.currentTarget.style.borderColor = "#9a6e2e";
            }}
          >
            {t.mode === "idle"
              ? "Begin"
              : t.mode === "shortBreak"
              ? "Take a Break"
              : t.mode === "longBreak"
              ? "Long Break"
              : "Resume"}
          </button>
        ) : (
          <button
            onClick={t.pause}
            style={{
              background: "rgba(196, 138, 60, 0.12)",
              color: "#d4993f",
              border: "1px solid #9a6e2e",
              borderRadius: 4,
              padding: "0.6rem 1.6rem",
              fontFamily: "Futura, 'Trebuchet MS', sans-serif",
              fontSize: "0.82rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(196, 138, 60, 0.25)";
              e.currentTarget.style.color = "#e9dfce";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(196, 138, 60, 0.12)";
              e.currentTarget.style.color = "#d4993f";
            }}
          >
            Pause
          </button>
        )}
        <button
          onClick={t.reset}
          style={{
            background: "transparent",
            color: "#bfb49e",
            border: "none",
            padding: "0.5rem 1rem",
            fontFamily: "Futura, 'Trebuchet MS', sans-serif",
            fontSize: "0.72rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e9dfce")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#bfb49e")}
        >
          Reset
        </button>
        <button
          onClick={t.skip}
          style={{
            background: "transparent",
            color: "#bfb49e",
            border: "none",
            padding: "0.5rem 1rem",
            fontFamily: "Futura, 'Trebuchet MS', sans-serif",
            fontSize: "0.72rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e9dfce")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#bfb49e")}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
