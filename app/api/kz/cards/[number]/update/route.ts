import { NextRequest, NextResponse } from "next/server";
import { getKzClient } from "@/lib/kanbanzone/server";

/**
 * PUT /api/kz/cards/[number]/update
 *
 * Body: { label?, title?, description?, blocked?, owner? }
 *
 * Thin wrapper around KZ updateCard. Used to relabel cards,
 * rename them, etc.
 */
export async function PUT(
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

    const body = await req.json();
    const kz = getKzClient();
    const updated = await kz.updateCard(cardNumber, body);

    return NextResponse.json({ ok: true, card: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/kz/cards/[number]/update] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
