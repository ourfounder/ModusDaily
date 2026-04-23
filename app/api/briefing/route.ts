import { NextResponse } from "next/server";
import { parseFullBriefing } from "@/lib/briefing/parseFullBriefing";

/**
 * GET /api/briefing
 *
 * Reads PipBoy's briefing.html from local disk, parses all sections
 * (calendar, signals, projects, inbox, action stack) into typed JSON.
 * Dev-only (local filesystem). No caching — the file may change mid-day.
 */
export async function GET() {
  try {
    const data = await parseFullBriefing();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/briefing] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
