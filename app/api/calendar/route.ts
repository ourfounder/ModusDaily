import { NextResponse } from "next/server";

/**
 * GET /api/calendar — fetch live calendar events from Google Calendar's
 * secret iCal URL. No OAuth required — just a plain HTTP fetch.
 *
 * Set GOOGLE_ICAL_URL in .env.local to the "Secret address in iCal format"
 * from Google Calendar Settings → [your calendar] → Integrate calendar.
 */

type CalendarEvent = {
  time: string;
  endTime: string;
  title: string;
  meta: string[];
  badge: string | null;
  classes: string[];
  allDay: boolean;
};

export async function GET() {
  const icalUrl = process.env.GOOGLE_ICAL_URL;
  if (!icalUrl) {
    return NextResponse.json(
      { error: "GOOGLE_ICAL_URL not set in .env.local" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(icalUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`iCal fetch failed: ${res.status}`);
    const icalText = await res.text();
    const events = parseIcal(icalText);
    return NextResponse.json({ events, fetchedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

// ── Minimal iCal parser — extracts today's VEVENT blocks ──────────

function parseIcal(text: string): CalendarEvent[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  // Split into VEVENT blocks
  const blocks: string[] = [];
  const regex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[0]);
  }

  const events: CalendarEvent[] = [];

  for (const block of blocks) {
    const get = (key: string): string => {
      // Handle folded lines (continuation lines start with space/tab)
      const unfolded = block.replace(/\r?\n[ \t]/g, "");
      // Match both plain and parameterized forms: DTSTART:... or DTSTART;TZID=...:...
      const re = new RegExp(`^${key}[;:](.*)$`, "m");
      const m = unfolded.match(re);
      if (!m) return "";
      // If parameterized (e.g. DTSTART;TZID=America/Los_Angeles:20260417T090000)
      // extract just the value after the last colon
      const raw = m[1];
      const colonIdx = raw.lastIndexOf(":");
      // But only if there's a ; before it (parameterized)
      if (m[0].includes(";") && colonIdx > 0) return raw.slice(colonIdx + 1);
      return raw;
    };

    const summary = get("SUMMARY");
    const status = get("STATUS");
    const dtstart = get("DTSTART");
    const dtend = get("DTEND");
    const location = get("LOCATION");

    if (!dtstart) continue;

    // Parse dates
    const startDate = parseIcalDate(dtstart);
    const endDate = dtend ? parseIcalDate(dtend) : null;
    if (!startDate) continue;

    // Filter to today only
    const allDay = dtstart.length === 8; // YYYYMMDD vs YYYYMMDDTHHMMSS
    if (allDay) {
      // All-day event: starts on this date
      const eventDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      if (eventDay < todayStart || eventDay >= todayEnd) continue;
    } else {
      // Timed event: overlaps with today
      const eventEnd = endDate ?? new Date(startDate.getTime() + 3600000);
      if (eventEnd <= todayStart || startDate >= todayEnd) continue;
    }

    const declined = status?.toUpperCase() === "CANCELLED";

    const timeStr = allDay
      ? "All day"
      : formatTime(startDate) + (endDate ? ` – ${formatTime(endDate)}` : "");

    const meta: string[] = [];
    if (location) meta.push(location);

    events.push({
      time: timeStr,
      endTime: endDate ? formatTime(endDate) : "",
      title: unescapeIcal(summary),
      meta,
      badge: null,
      classes: declined ? ["declined"] : [],
      allDay,
    });
  }

  // Sort: all-day first, then by time
  events.sort((a, b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    return a.time.localeCompare(b.time);
  });

  return events;
}

function parseIcalDate(s: string): Date | null {
  // YYYYMMDD or YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  if (!s || s.length < 8) return null;
  const y = parseInt(s.slice(0, 4));
  const mo = parseInt(s.slice(4, 6)) - 1;
  const d = parseInt(s.slice(6, 8));
  if (s.length === 8) return new Date(y, mo, d);
  const h = parseInt(s.slice(9, 11));
  const mi = parseInt(s.slice(11, 13));
  const sec = parseInt(s.slice(13, 15)) || 0;
  if (s.endsWith("Z")) return new Date(Date.UTC(y, mo, d, h, mi, sec));
  return new Date(y, mo, d, h, mi, sec);
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function unescapeIcal(s: string): string {
  return s
    .replace(/\\n/g, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}
