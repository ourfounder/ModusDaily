import { NextRequest, NextResponse } from "next/server";
import { getKzClient, getBoardName } from "@/lib/kanbanzone/server";

/**
 * POST /api/kz/cards/[number]/move
 *
 * Body: { toColumnTitle: string }  (preferred — human-readable)
 *   OR: { toColumnId: string }     (if client already resolved it)
 *
 * Looks up the destination column's ID on the configured board,
 * then calls KZ's moveCard. `moveCard()` in the client is one of
 * the endpoints that works correctly (unlike the Q7-affected
 * board-metadata reads).
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await ctx.params;
    const cardNumber = Number(number);
    if (!Number.isFinite(cardNumber)) {
      return NextResponse.json(
        { error: `Invalid card number: ${number}` },
        { status: 400 }
      );
    }

    const body = (await req.json()) as {
      toColumnTitle?: string;
      toColumnId?: string;
      position?: number;
    };

    let columnId = body.toColumnId;

    // Resolve title → id if needed (raw fetch; Q7 workaround).
    if (!columnId && body.toColumnTitle) {
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
      const rawBody = (await rawRes.json()) as {
        boards?: Array<{
          BoardItem?: {
            columns?: Array<{
              ColumnItem?: { columnId?: string; title?: string };
            }>;
          };
        }>;
        BoardItem?: {
          columns?: Array<{
            ColumnItem?: { columnId?: string; title?: string };
          }>;
        };
      };
      const board = rawBody?.boards?.[0]?.BoardItem || rawBody?.BoardItem;
      const rawColumns = board?.columns ?? [];
      const unwrapped = rawColumns.map(
        (c) =>
          (c?.ColumnItem ?? c) as { columnId?: string; title?: string }
      );
      const match = unwrapped.find(
        (c) =>
          typeof c?.title === "string" &&
          c.title.toLowerCase() === body.toColumnTitle!.toLowerCase()
      );
      columnId = match?.columnId;
      if (!columnId) {
        return NextResponse.json(
          {
            error: `Column titled "${body.toColumnTitle}" not found on board.`,
          },
          { status: 404 }
        );
      }
    }

    if (!columnId) {
      return NextResponse.json(
        { error: "Must provide toColumnTitle or toColumnId." },
        { status: 400 }
      );
    }

    const kz = getKzClient();
    await kz.moveCard(cardNumber, {
      columnId,
      ...(typeof body.position === "number" ? { position: body.position } : {}),
    });

    return NextResponse.json({ ok: true, cardNumber, columnId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/kz/cards/[number]/move] failed:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
