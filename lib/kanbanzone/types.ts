/** KanbanZone board (from GET /boards response) */
export interface KZBoard {
  publicId: string;
  name: string;
  isArchived: boolean;
  activeCardsCount: number;
  archivedCardsCount: number;
  backlogCardsCount: number;
  blockedCardsCount: number;
  overdueCardsCount: number;
  adminsCount: number;
  collaboratorsCount: number;
  subscribersCount: number;
  columns?: KZColumn[];
}

/** KanbanZone column (lane) within a board */
export interface KZColumn {
  boardTitle: string;
  parent?: string;
  parentTitle?: string;
  title: string;
  type: "CARD" | "PARENT";
  columnState: string;
  minWIP?: number;
  maxWIP?: number;
  explicitAgreement?: string;
  /** Column ID (MongoDB-style ObjectId) — present when returned inline */
  id?: string;
}

/** KanbanZone card (from GET /cards response) */
export interface KZCard {
  boardTitle: string;
  boardPublicId: string;
  columnId: string;
  columnTitle: string;
  columnState: string;
  number: number;
  title: string;
  description?: string;
  blocked: boolean;
  blockedBy?: string;
  blockedReason?: string;
  dueAt?: string;
  owner?: string;
  label?: string;
  watchers?: string[];
  lastActionAt?: string;
  lastActionBy?: string;
  archivedAt?: string;
  doneAt?: string;
  createdAt?: string;
  customFields?: KZCustomField[];
}

/** KanbanZone card with links wrapper (as returned by API) */
export interface KZCardWrapper {
  CardItem: KZCard;
  links?: {
    add?: KZCardLink[];
  };
}

/** KanbanZone board wrapper (as returned by API) */
export interface KZBoardWrapper {
  BoardItem: KZBoard;
}

/** Card link (parent, child, predecessor, successor, or external URL) */
export interface KZCardLink {
  card?: number;
  type?: string;
  url?: string;
  title?: string;
}

/** Custom field on a card */
export interface KZCustomField {
  label: string;
  value: string;
}

/** KanbanZone card comment */
export interface KZComment {
  id: string;
  body: string;
  author?: string;
  createdAt?: string;
}

/** Card update payload for PUT /cards/{id} */
export interface KZCardUpdate {
  columnId?: string;
  title?: string;
  description?: string;
  blocked?: boolean;
  blockedReason?: string;
  dueAt?: string;
  owner?: string;
  label?: string;
}

/** Card creation payload for POST /card */
export interface KZCardCreate {
  board: string;
  columnId: string;
  title: string;
  description?: string;
  label?: string;
  owner?: string;
  dueAt?: string;
}

/** Card move payload for POST /cards/{id}/move */
export interface KZCardMove {
  columnId: string;
  position?: number;
}

/** Paginated cards response */
export interface KZCardsResponse {
  count: number;
  totalAvailable: number;
  hasMore: boolean;
  cards: KZCardWrapper[];
}

/** Boards list response */
export interface KZBoardsResponse {
  count: number;
  boards: KZBoardWrapper[];
  errors?: { error: boolean; errors: string[] };
}
