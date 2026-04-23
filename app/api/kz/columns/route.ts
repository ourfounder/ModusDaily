import { NextResponse } from "next/server";
import { getKzClient, getBoardName } from "@/lib/kanbanzone/server";

/**
 * GET /api/kz/columns
 *
 * Returns the columns on the configured ModusDaily KZ board.
 * Used on first run (and as a sanity check) to see what the board
 * currently has vs. what ModusDaily expects.
 *
 * Target columns: Candidates | Today | In Progress | On Hold | Done | Context
 */
export async function GET() {
  try {
    const kz = getKzClient();
    const boardName = getBoardName();
    // /boards (list) does NOT return columns even with includeColumns=true.
    // Fetch the single-board endpoint to get the column structure.
    const boards = await kz.listBoards({ includeArchived: false });

    const summary = boards.find(
      (b) => b.name.toLowerCase() === boardName.toLowerCase()
    );

    if (!summary) {
      return NextResponse.json(
        {
          error: `Board named "${boardName}" not found in workspace.`,
          availableBoards: boards.map((b) => b.name),
        },
        { status: 404 }
      );
    }

    // KZ's /board/{id} returns a list-wrapper, not a single object.
    // And columns only come back when explicitly requested via query params.
    const apiKey = process.env.KANBANZONE_API_KEY!;
    const auth = `Basic ${Buffer.from(apiKey).toString("base64")}`;
    const rawRes = await fetch(
      `https://integrations.kanbanzone.io/v1/board/${summary.publicId}?includeColumns=true&includeCustomFields=true`,
      { headers: { Authorization: auth } }
    );
    const rawBody = await rawRes.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyBody = rawBody as any;
    // Unwrap whichever shape KZ actually returns.
    const board =
      anyBody?.boards?.[0]?.BoardItem ||
      anyBody?.BoardItem ||
      anyBody?.board ||
      anyBody;

    if (!board?.columns) {
      return NextResponse.json(
        {
          debug: true,
          note: "Columns still missing. Raw body attached — inspect its shape.",
          rawTopLevelKeys: Object.keys(anyBody ?? {}),
          rawBody,
        },
        { status: 200 }
      );
    }

    const expected = [
      "Candidates",
      "Today",
      "In Progress",
      "On Hold",
      "Done",
      "Context",
    ];
    // KZ wraps each column as { ColumnItem: {...} }. Unwrap before reading.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawColumns: any[] = board.columns ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unwrappedColumns = rawColumns.map((c: any) => c?.ColumnItem ?? c);
    const actualNames: string[] = unwrappedColumns
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => c?.title)
      .filter((t: unknown): t is string => typeof t === "string" && t.length > 0);
    const missing = expected.filter(
      (e) => !actualNames.some((a) => a.toLowerCase() === e.toLowerCase())
    );
    const extra = actualNames.filter(
      (a) => !expected.some((e) => e.toLowerCase() === a.toLowerCase())
    );

    return NextResponse.json({
      board: { name: board.name, publicId: board.publicId },
      columns: unwrappedColumns,
      reconciliation: {
        expected,
        actual: actualNames,
        missing,
        extra,
        matches: missing.length === 0,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
