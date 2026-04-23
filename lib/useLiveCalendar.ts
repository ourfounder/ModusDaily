"use client";

import { useCallback, useEffect, useState } from "react";
import type { CalendarEvent } from "./briefing/parseFullBriefing";

/**
 * Fetches live calendar events from /api/calendar (Google iCal feed).
 * Falls back to briefing calendar data if the live endpoint isn't configured.
 */
export function useLiveCalendar(briefingEvents: CalendarEvent[] | null) {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [usingLive, setUsingLive] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar", { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setEvents(json.events as CalendarEvent[]);
      setFetchedAt(json.fetchedAt);
      setUsingLive(true);
    } catch {
      // Live endpoint not available — fall back to briefing data
      setUsingLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Try live on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Use live events if available, otherwise briefing
  const displayEvents = usingLive && events ? events : (briefingEvents ?? []);

  return { events: displayEvents, loading, refresh, fetchedAt, usingLive };
}
