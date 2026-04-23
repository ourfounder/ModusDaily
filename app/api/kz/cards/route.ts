import { NextResponse } from "next/server";
import { getKzClient, getBoardName } from "@/lib/kanbanzone/server";

/**
 * GET /api/kz/cards
 *
 * Returns all cards on the configured ModusDaily KZ board, grouped by
 * column. Column order mirrors the six-column target layout:
 *   Candidates | Today | In Progress | On Hold | Done | Context
 *
 * Also returns the `columns` metadata (title + columnId) so the client
 * can build a "Move to..." menu without a second round-trip.
 *
 * Note: board/column metadata is fetched via raw fetch (Q7 bugs in the
 * inherited KZ client). Card reads go through the client proper — those
 * methods unwrap `CardItem` correctly.
 */

const COLUMN_ORDER = [
  "Candidates",
  "Today",
  "In Progress",
  "On Hold",
  "Done",
  "Context",
];

export async function GET() {
  try {
    const kz = getKzClient();
    const boardName = getBoardName();

    // Find the target board's publicId.
    const boards = await kz.listBoards({ includeArchived: false });
    const summary = boards.find(
      (b) => b.name.toLowerCase() === boardName.toLowerCase()
    );
    if (!summary) {
      return NextResponse.json(
        {
          error: `Board named "${boardName}" not found.`,
          availableBoards: boards.map((b) => b.name),
        },
        { status: 404 }
      );
    }

    // Get columns via raw fetch (Q7 workaround for the buggy getBoard wrapper).
    const apiKey = process.env.KANBANZONE_API_KEY!;
    const auth = `Basic ${Buffer.from(apiKey).toString("base64")}`;
    const rawRes = await fetch(
      `https://integrations.kanbanzone.io/v1/board/${summary.publicId}?includeColumns=true`,
      { headers: { Authorization: auth } }
    );
    // KZ's column objects use `columnId` (not `id`) as the ObjectId field.
    // The inherited types file declares `id?: string` which is wrong —
    // noted as an addition to Q7 in state/open-questions.md.
    type RawBoard = {
      name?: string;
      publicId?: string;
      columns?: Array<{ ColumnItem?: { columnId?: string; title?: string } }>;
    };
    const rawBody = (await rawRes.json()) as {
      boards?: Array<{ BoardItem?: RawBoard }>;
      BoardItem?: RawBoard;
    };
    const board = rawBody?.boards?.[0]?.BoardItem || rawBody?.BoardItem;
    const rawColumns = board?.columns ?? [];
    const columns = rawColumns
      .map(
        (c) =>
          (c?.ColumnItem ?? c) as { columnId?: string; title?: string }
      )
      .filter(
        (c): c is { columnId: string; title: string } =>
          !!c && typeof c.columnId === "string" && typeof c.title === "string"
      )
      .map((c) => ({ columnId: c.columnId, title: c.title }));

    // Get all cards via the proper client (wrappers are handled correctly).
    const cards = await kz.getAllBoardCards(summary.publicId);

    // Group cards by columnTitle, honoring COLUMN_ORDER for the named ones;
    // any column not in COLUMN_ORDER (e.g. Archive) falls to the end in the
    // order KZ returns it.
    const grouped = new Map<string, typeof cards>();
    for (const name of COLUMN_ORDER) grouped.set(name, []);
    for (const card of cards) {
      if (!grouped.has(card.columnTitle)) {
        grouped.set(card.columnTitle, []);
      }
      grouped.get(card.columnTitle)!.push(card);
    }

    const columnsOut = Array.from(grouped.entries()).map(([title, cardList]) => {
      const meta = columns.find(
        (c) => c.title.toLowerCase() === title.toLowerCase()
      );
      return {
        title,
        columnId: meta?.columnId ?? null,
        cards: cardList.map((c) => ({
          number: c.number,
          title: c.title,
          label: c.label,
          columnId: c.columnId,
          columnTitle: c.columnTitle,
          blocked: c.blocked,
          description: c.description,
        })),
      };
    });

    return NextResponse.json({
      board: { name: board?.name ?? summary.name, publicId: summary.publicId },
      columns: columnsOut,
      totalCards: cards.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/kz/cards] failed:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
