/**
 * KZ column ↔ UI column mapping.
 *
 * KZ board has: Candidates | Today | In Progress | On Hold | Done | Context | Archive
 * UI displays:  Candidates | Today | Now | Done   (kanban columns)
 *               Waiting                            (horizontal shelf at bottom)
 *
 * "Candidates" is the backlog / tomorrow lane.
 * "Waiting" maps to KZ "On Hold" — cards where the ball is in someone else's court.
 * "Now" maps to In Progress.
 * Context and Archive are hidden from the kanban (Context feeds briefing).
 */

export type UiColumn = "Candidates" | "Today" | "Now" | "Done";

/** The Waiting shelf is a separate display zone, not a kanban column. */
export const WAITING_KZ_COLUMN = "On Hold";

/** Map a KZ column title to its UI display column. Returns null for hidden columns. */
export function kzToUi(kzTitle: string): UiColumn | null {
  switch (kzTitle.toLowerCase()) {
    case "candidates":
      return "Candidates";
    case "today":
      return "Today";
    case "in progress":
      return "Now";
    case "done":
      return "Done";
    case "on hold":
      return null; // Rendered separately in WaitingShelf
    default:
      return null; // Context, Archive, etc. — hidden
  }
}

/** Map a UI column back to the primary KZ column title for move operations. */
export function uiToKz(uiTitle: UiColumn): string {
  switch (uiTitle) {
    case "Candidates":
      return "Candidates";
    case "Today":
      return "Today";
    case "Now":
      return "In Progress";
    case "Done":
      return "Done";
  }
}

/** Ordered UI columns for rendering in the kanban. */
export const UI_COLUMNS: UiColumn[] = [
  "Candidates",
  "Today",
  "Now",
  "Done",
];
