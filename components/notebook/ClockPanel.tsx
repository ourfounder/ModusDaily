"use client";

import { useEffect, useState } from "react";
import type { CalendarEvent } from "@/lib/briefing/parseFullBriefing";

function parseEventTime(timeStr: string): Date | null {
  // Parses "9:00 AM", "10:30 AM", "2:00 PM" relative to today
  if (!timeStr || timeStr.toLowerCase().includes("all day")) return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function getNextEvent(events: CalendarEvent[], now: Date): { event: CalendarEvent; minutesUntil: number } | null {
  let closest: { event: CalendarEvent; minutesUntil: number } | null = null;
  for (const ev of events) {
    const t = parseEventTime(ev.time);
    if (!t) continue;
    const diff = (t.getTime() - now.getTime()) / 60000;
    if (diff >= -5 && diff <= 480) { // within next 8 hours, allow 5 min overlap
      if (!closest || diff < closest.minutesUntil) {
        closest = { event: ev, minutesUntil: Math.round(diff) };
      }
    }
  }
  return closest;
}

export default function ClockPanel({ events }: { events: CalendarEvent[] }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const h12 = hours % 12 || 12;
  const ampm = hours < 12 ? "AM" : "PM";

  const dayStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const next = getNextEvent(events, now);

  return (
    <div style={{ padding: "1.8rem 1.6rem 1.4rem" }}>
      {/* Big clock */}
      <div
        style={{
          fontFamily: "var(--font-inter), Inter, sans-serif",
          fontWeight: 300,
          fontSize: "5.5rem",
          lineHeight: 1,
          letterSpacing: "-0.03em",
          color: "var(--ink)",
          display: "flex",
          alignItems: "baseline",
          gap: "0.4rem",
        }}
      >
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {h12}:{minutes}
        </span>
        <span
          style={{
            fontSize: "1.2rem",
            fontWeight: 400,
            color: "var(--ink-faint)",
            letterSpacing: "0.04em",
          }}
        >
          {ampm}
        </span>
      </div>

      {/* Date */}
      <div
        style={{
          marginTop: "0.3rem",
          fontFamily: "var(--font-inter), Inter, sans-serif",
          fontSize: "0.8rem",
          fontWeight: 400,
          color: "var(--ink-dim)",
          letterSpacing: "0.02em",
        }}
      >
        {dayStr}
      </div>

      {/* Divider */}
      <div
        style={{
          margin: "1.4rem 0 1.2rem",
          height: 1,
          background: "var(--border)",
        }}
      />

      {/* Next event */}
      {next ? (
        <div>
          <div
            style={{
              fontFamily: "var(--font-inter), Inter, sans-serif",
              fontSize: "0.62rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: "0.5rem",
            }}
          >
            Next
          </div>
          <div
            style={{
              fontFamily: "var(--font-inter), Inter, sans-serif",
              fontSize: "1rem",
              fontWeight: 500,
              color: "var(--ink)",
              lineHeight: 1.3,
              marginBottom: "0.4rem",
            }}
          >
            {next.event.title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontFamily: "var(--font-inter), Inter, sans-serif",
              fontSize: "0.8rem",
              color: "var(--ink-dim)",
            }}
          >
            <span style={{ color: "var(--ink-faint)" }}>{next.event.time}</span>
            <span
              style={{
                background: next.minutesUntil <= 15 ? "rgba(13,107,63,0.1)" : "var(--accent-dim)",
                color: next.minutesUntil <= 15 ? "var(--accent)" : "var(--ink-dim)",
                borderRadius: 99,
                padding: "0.15rem 0.6rem",
                fontSize: "0.72rem",
                fontWeight: 500,
              }}
            >
              {next.minutesUntil <= 0
                ? "Now"
                : next.minutesUntil === 1
                ? "1 min"
                : `${next.minutesUntil} min`}
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontSize: "0.85rem",
            color: "var(--ink-faint)",
            fontStyle: "italic",
          }}
        >
          No upcoming events
        </div>
      )}
    </div>
  );
}
