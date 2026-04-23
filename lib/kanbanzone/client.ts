import type {
  KZBoard,
  KZCard,
  KZCardCreate,
  KZCardUpdate,
  KZCardMove,
  KZComment,
  KZCardsResponse,
  KZBoardsResponse,
} from "./types";

/**
 * KanbanZone API client.
 *
 * API docs: https://docs.kanbanzone.io/
 * Base URL: https://integrations.kanbanzone.io/v1
 * Auth: Basic (Base64-encoded API key)
 */
export class KanbanZoneClient {
  private baseUrl: string;
  private authHeader: string;
  private workspaceId: string;

  constructor(opts: { apiKey: string; workspaceId: string; baseUrl?: string }) {
    this.workspaceId = opts.workspaceId;
    this.baseUrl = opts.baseUrl || "https://integrations.kanbanzone.io/v1";
    // API key must be Base64-encoded for Basic auth
    this.authHeader = `Basic ${Buffer.from(opts.apiKey).toString("base64")}`;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new KanbanZoneError(
        `KanbanZone API error ${res.status}: ${errText}`,
        res.status
      );
    }

    // KZ sometimes wraps errors in a 200-status body with a `status` field
    // (e.g. rate limits: `{ code: 2006, status: 429, name: "TooManyRequests",
    // message: "...", retryAfter: "300 seconds" }`). Detect and throw so
    // callers don't try to `.map()` a nonexistent field.
    const body = await res.json();
    if (
      body &&
      typeof body === "object" &&
      typeof body.status === "number" &&
      body.status >= 400 &&
      typeof body.message === "string" &&
      typeof body.name === "string"
    ) {
      const detail = body.retryAfter
        ? ` (retry after ${body.retryAfter})`
        : "";
      throw new KanbanZoneError(
        `KanbanZone ${body.name} [${body.code ?? "?"}]: ${body.message}${detail}`,
        body.status
      );
    }
    return body as T;
  }

  /** List all boards (optionally include columns and custom fields) */
  async listBoards(opts?: {
    includeColumns?: boolean;
    includeCustomFields?: boolean;
    includeArchived?: boolean;
  }): Promise<KZBoard[]> {
    const params = new URLSearchParams();
    if (opts?.includeColumns) params.set("includeColumns", "true");
    if (opts?.includeCustomFields) params.set("includeCustomFields", "true");
    if (opts?.includeArchived) params.set("includeArchived", "true");
    const qs = params.toString();
    const resp = await this.request<KZBoardsResponse>(
      `/boards${qs ? `?${qs}` : ""}`
    );
    return resp.boards.map((b) => b.BoardItem);
  }

  /** Get a single board by public ID */
  async getBoard(boardPublicId: string): Promise<KZBoard> {
    const resp = await this.request<{ BoardItem: KZBoard }>(
      `/board/${boardPublicId}`
    );
    return resp.BoardItem;
  }

  /** Get cards from a board (paginated, max 100 per page) */
  async getBoardCards(
    boardPublicId: string,
    opts?: {
      page?: number;
      count?: number;
      columns?: string[];
      includeArchived?: boolean;
    }
  ): Promise<KZCardsResponse> {
    const params = new URLSearchParams({ board: boardPublicId });
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.count) params.set("count", String(opts.count));
    if (opts?.columns?.length) params.set("columns", opts.columns.join(","));
    if (opts?.includeArchived) params.set("includeArchived", "true");
    return this.request<KZCardsResponse>(`/cards?${params.toString()}`);
  }

  /** Get all cards from a board (handles pagination automatically) */
  async getAllBoardCards(boardPublicId: string): Promise<KZCard[]> {
    const allCards: KZCard[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const resp = await this.getBoardCards(boardPublicId, { page, count: 100 });
      allCards.push(...resp.cards.map((c) => c.CardItem));
      hasMore = resp.hasMore;
      page++;
    }

    return allCards;
  }

  /** Create a card on a board.
   *
   * Robust to both shapes KZ has been observed returning for single-card
   * endpoints: `{CardItem: KZCard}` on list endpoints, flat `KZCard` on
   * POST /card. The inherited client assumed the wrapped shape and blew
   * up on successful creates. See state/decisions.md — 4th bug added to
   * the KZ-client bug log.
   */
  async createCard(data: KZCardCreate): Promise<KZCard> {
    const resp = await this.request<KZCard | { CardItem: KZCard }>(`/card`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return unwrapCard(resp);
  }

  /** Get a single card by number */
  async getCard(cardNumber: number): Promise<KZCard> {
    const resp = await this.request<KZCard | { CardItem: KZCard }>(
      `/cards/${cardNumber}`
    );
    return unwrapCard(resp);
  }

  /** Update a card by number */
  async updateCard(cardNumber: number, data: KZCardUpdate): Promise<KZCard> {
    const resp = await this.request<KZCard | { CardItem: KZCard }>(
      `/cards/${cardNumber}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
    return unwrapCard(resp);
  }

  /** Move a card to a different column */
  async moveCard(cardNumber: number, data: KZCardMove): Promise<void> {
    await this.request(`/cards/${cardNumber}/move`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /** Get comments for a card */
  async getCardComments(cardNumber: number): Promise<KZComment[]> {
    return this.request<KZComment[]>(`/cards/${cardNumber}/comments`);
  }

  /** Add a comment to a card */
  async addCardComment(
    cardNumber: number,
    body: string
  ): Promise<KZComment> {
    return this.request<KZComment>(`/cards/${cardNumber}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }
}

/** Unwrap a KZ card whether the API returned it flat or inside {CardItem}. */
function unwrapCard(resp: KZCard | { CardItem: KZCard }): KZCard {
  if (resp && typeof resp === "object" && "CardItem" in resp && resp.CardItem) {
    return resp.CardItem;
  }
  return resp as KZCard;
}

export class KanbanZoneError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "KanbanZoneError";
    this.status = status;
  }
}

/** Create a KanbanZone client from environment variables */
export function createKanbanZoneClient(): KanbanZoneClient {
  const apiKey = process.env.KANBANZONE_API_KEY;
  const workspaceId = process.env.KANBANZONE_WORKSPACE_ID;

  if (!apiKey || !workspaceId) {
    throw new Error(
      "Missing KANBANZONE_API_KEY or KANBANZONE_WORKSPACE_ID environment variables"
    );
  }

  return new KanbanZoneClient({ apiKey, workspaceId });
}
