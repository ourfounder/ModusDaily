"use client";

import { useCallback, useEffect, useState } from "react";
import type { BriefingData } from "./briefing/parseFullBriefing";

export type { BriefingData };

export function useBriefing() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/briefing", { cache: "no-store" });
      if (!res.ok) throw new Error(`GET /api/briefing ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json as BriefingData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
