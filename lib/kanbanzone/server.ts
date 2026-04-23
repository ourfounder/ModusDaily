import "server-only";
import { KanbanZoneClient } from "./client";

let cached: KanbanZoneClient | null = null;

/**
 * Get a singleton KanbanZone client for use in server routes.
 * Reads KANBANZONE_API_KEY and KANBANZONE_WORKSPACE_ID from env.
 */
export function getKzClient(): KanbanZoneClient {
  if (cached) return cached;

  const apiKey = process.env.KANBANZONE_API_KEY;
  const workspaceId = process.env.KANBANZONE_WORKSPACE_ID;

  if (!apiKey || !workspaceId) {
    throw new Error(
      "Missing KANBANZONE_API_KEY or KANBANZONE_WORKSPACE_ID environment variables. " +
        "Copy .env.local.example to .env.local and fill in values."
    );
  }

  cached = new KanbanZoneClient({ apiKey, workspaceId });
  return cached;
}

/** The name of the KZ board ModusDaily reads/writes. */
export function getBoardName(): string {
  return process.env.MODUSDAILY_BOARD_NAME || "ModusOS";
}
