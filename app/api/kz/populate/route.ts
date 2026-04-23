import { NextRequest, NextResponse } from "next/server";
import { getKzClient, getBoardName } from "@/lib/kanbanzone/server";
import { parseBriefing, parseStateReports, type CardIntent } from "@/lib/briefing/parse";

/**
 * POST /api/kz/populate
 *
 * Reads the current daily briefing (X:/ClaudeWork/PipBoy/briefing.html) and
 * every project's state/open-questions.md file on local disk, turns each
 * actionable item into a card intent, and pushes the survivors to the
 * configured KanbanZone board.
 *
 * Dedup policy: a card intent is SKIPPED if the board already has a card
 * with the same (title, label) pair (case-insensitive). This makes repeat
 * calls idempotent so Jim can hit "Populate" twice without duplicating.
 *
 * Query/body flag: `?dryRun=1` (or { dryRun: true } in JSON body) returns
 * the plan without actually creating cards. Use this before committing.
 *
 * IMPORTANT: relies on local filesystem reads. Only works in local/dev.
 * Eventually the briefing and state reports live in KZ directly
 * (Pattern #1 — KZ is the cloud store) and this route becomes a thin
 * re-sync instead of a file reader.
 */

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const bodyText = await req.text();
    let body: { dryRun?: boolean; intents?: CardIntent[] } = {};
    if (bodyText) {
      try {
        body = JSON.parse(bodyText);
      } catch {
        /* allow empty body */
      }
    }
    const dryRun =
      url.searchParams.get("dryRun") === "1" || body.dryRun === true;

    // 1. Gather intents.
    //    - If caller supplied an `intents` manifest in the body (e.g. from
    //      /pip-standup after Jim agreed to a Today), use those directly.
    //    - Otherwise fall back to parsing briefing.html + state files.
    let allIntents: CardIntent[];
    if (Array.isArray(body.intents) && body.intents.length > 0) {
      allIntents = body.intents
        .map((i) => ({
          title: String(i.title ?? "").trim(),
          columnTitle: String(i.columnTitle ?? "").trim(),
          label: i.label ? String(i.label).trim() : "",
          source: i.source ? String(i.source) : "manifest",
        }))
        .filter((i) => i.title && i.columnTitle);
    } else {
      const [briefingIntents, stateIntents] = await Promise.all([
        parseBriefing(),
        parseStateReports(),
      ]);
      allIntents = [...briefingIntents, ...stateIntents];
    }

    if (allIntents.length === 0) {
      return NextResponse.json({
        ok: true,
        message:
          "No card intents generated. Check briefing.html exists and state/open-questions.md files have an Active section.",
        created: [],
        skipped: [],
      });
    }

    // 2. Resolve the board + its column IDs (raw fetch; Q7 workaround).
    const kz = getKzClient();
    const boardName = getBoardName();
    const boards = await kz.listBoards({ includeArchived: false });
    const summary = boards.find(
      (b) => b.name.toLowerCase() === boardName.toLowerCase()
    );
    if (!summary) {
      return NextResponse.json(
        { error: `Board "${boardName}" not found.` },
        { status: 404 }
      );
    }

    const apiKey = process.env.KANBANZONE_API_KEY!;
    const auth = `Basic ${Buffer.from(apiKey).toString("base64")}`;
    const rawRes = await fetch(
      `https://integrations.kanbanzone.io/v1/board/${summary.publicId}?includeColumns=true`,
      { headers: { Authorization: auth } }
    );
    type RawCol = { columnId?: string; title?: string };
    const rawBody = (await rawRes.json()) as {
      boards?: Array<{ BoardItem?: { columns?: Array<{ ColumnItem?: RawCol }> } }>;
      BoardItem?: { columns?: Array<{ ColumnItem?: RawCol }> };
    };
    const board = rawBody?.boards?.[0]?.BoardItem || rawBody?.BoardItem;
    const columns = (board?.columns ?? [])
      .map((c) => (c?.ColumnItem ?? c) as RawCol)
      .filter(
        (c): c is { columnId: string; title: string } =>
          !!c && typeof c.columnId === "string" && typeof c.title === "string"
      );

    const columnIdFor = (title: string) =>
      columns.find((c) => c.title.toLowerCase() === title.toLowerCase())
        ?.columnId;

    // 3. Load existing cards for dedup.
    const existing = await kz.getAllBoardCards(summary.publicId);
    const key = (title: string, label: string | undefined) =>
      `${(label ?? "").toLowerCase()}::${title.toLowerCase().trim()}`;
    const existingKeys = new Set(existing.map((c) => key(c.title, c.label)));

    // 4. Plan (dedup), create, and collect results.
    const plan: Array<CardIntent & { columnId: string | null }> = allIntents.map(
      (i) => ({
        ...i,
        columnId: columnIdFor(i.columnTitle) ?? null,
      })
    );

    const skipped: Array<{ intent: CardIntent; reason: string }> = [];
    const toCreate: Array<CardIntent & { columnId: string }> = [];
    const seenInBatch = new Set<string>();

    for (const p of plan) {
      if (!p.columnId) {
        skipped.push({
          intent: p,
          reason: `no columnId found for "${p.columnTitle}"`,
        });
        continue;
      }
      const k = key(p.title, p.label);
      if (existingKeys.has(k)) {
        skipped.push({ intent: p, reason: "already on board" });
        continue;
      }
      if (seenInBatch.has(k)) {
        skipped.push({ intent: p, reason: "duplicate in this batch" });
        continue;
      }
      seenInBatch.add(k);
      toCreate.push({ ...p, columnId: p.columnId });
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        plan: toCreate.map((c) => ({
          title: c.title,
          columnTitle: c.columnTitle,
          label: c.label,
          source: c.source,
        })),
        skipped: skipped.map((s) => ({
          title: s.intent.title,
          label: s.intent.label,
          column: s.intent.columnTitle,
          reason: s.reason,
        })),
        totals: {
          wouldCreate: toCreate.length,
          skipped: skipped.length,
        },
      });
    }

    // 5. Actually create. Sequential to avoid rate limits / KZ auto-position surprises.
    const created: Array<{
      number: number;
      title: string;
      label: string;
      column: string;
    }> = [];
    const errors: Array<{ intent: CardIntent; message: string }> = [];

    for (const c of toCreate) {
      try {
        const card = await kz.createCard({
          board: summary.publicId,
          columnId: c.columnId,
          title: c.title,
          ...(c.label ? { label: c.label } : {}),
        });
        created.push({
          number: card.number,
          title: card.title,
          label: card.label ?? c.label,
          column: c.columnTitle,
        });
      } catch (err) {
        errors.push({
          intent: c,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      created,
      skipped: skipped.map((s) => ({
        title: s.intent.title,
        label: s.intent.label,
        column: s.intent.columnTitle,
        reason: s.reason,
      })),
      errors,
      totals: {
        created: created.length,
        skipped: skipped.length,
        errors: errors.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/kz/populate] failed:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
