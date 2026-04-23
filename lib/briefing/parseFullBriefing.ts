import { parse as parseHTML, type HTMLElement } from "node-html-parser";
import { readFile, stat } from "fs/promises";

/**
 * Full briefing HTML parser.
 *
 * Reads X:/ClaudeWork/PipBoy/briefing.html and extracts every section
 * into typed data: calendar events, client signals, project state,
 * inbox notes, and the action stack. Designed to be resilient to
 * evolving HTML — if a section is missing or the structure changes,
 * that section comes back empty rather than crashing.
 */

// ── Types ──────────────────────────────────────────────────────────

export type CalendarEvent = {
  time: string;
  title: string;
  meta: string[];
  badge: string | null;
  classes: string[]; // "priority", "new-client", "jt", "declined"
};

export type ClientSignal = {
  title: string;
  detail: string;
  action: string;
  urgency: "urgent" | "waiting" | "info" | "default";
  badge: string | null;
};

export type ProjectCard = {
  name: string;
  staleness: string;
  stalenessLevel: "fresh" | "recent" | "old" | "unknown";
  heat: "hot" | "active" | "warm" | "client" | "stale" | "normal";
  sections: Array<{ label: string; text: string }>;
  nextAction: string | null;
};

export type InboxItem = {
  text: string;
};

export type ActionStack = {
  mustDo: string[];
  meetings: string[];
  watching: string[];
};

export type BriefingData = {
  date: string;
  greeting: string;
  bigDayBanner: string | null;
  calendar: CalendarEvent[];
  signals: ClientSignal[];
  projects: ProjectCard[];
  inboxItems: InboxItem[];
  inboxEmpty: boolean;
  actionStack: ActionStack;
  generatedAt: string | null;
  fileModified: string | null;
};

// ── Main parser ────────────────────────────────────────────────────

const BRIEFING_PATH = "X:/ClaudeWork/PipBoy/briefing.html";

export async function parseFullBriefing(): Promise<BriefingData> {
  const html = await readFile(BRIEFING_PATH, "utf-8");
  const fileStat = await stat(BRIEFING_PATH).catch(() => null);
  const root = parseHTML(html);

  return {
    date: extractDate(root),
    greeting: extractGreeting(root),
    bigDayBanner: extractBigDayBanner(root),
    calendar: extractCalendar(root),
    signals: extractSignals(root),
    projects: extractProjects(root),
    inboxItems: extractInbox(root).items,
    inboxEmpty: extractInbox(root).empty,
    actionStack: extractActionStack(root),
    generatedAt: null, // set by client-side JS in the original HTML
    fileModified: fileStat ? fileStat.mtime.toISOString() : null,
  };
}

// ── Section extractors ─────────────────────────────────────────────

function extractDate(root: HTMLElement): string {
  // Try in order: .date-stamp, .header .date, .date-heading, .header h1
  const ds = root.querySelector(".date-stamp");
  if (ds) return ds.text.split("Generated:")[0]?.trim().replace(/\s+/g, " ") ?? "";
  const dateDiv = root.querySelector(".header .date");
  if (dateDiv) return dateDiv.text.trim();
  const dateHeading = root.querySelector(".date-heading");
  if (dateHeading) return dateHeading.text.trim();
  const h1 = root.querySelector(".header h1");
  return h1?.text?.trim() ?? "";
}

function extractGreeting(root: HTMLElement): string {
  const tagline = root.querySelector(".header .tagline");
  if (tagline) return tagline.text.trim();
  const h1 = root.querySelector(".header h1");
  const text = h1?.text?.trim() ?? "";
  if (text.match(/\d{4}/)) return "";
  return text;
}

function extractBigDayBanner(root: HTMLElement): string | null {
  const el =
    root.querySelector(".big-day-banner") ??
    root.querySelector(".alert-banner");
  return el ? el.text.trim() : null;
}

function extractCalendar(root: HTMLElement): CalendarEvent[] {
  // Try every known calendar container class
  let events = root.querySelectorAll(".event");
  if (events.length === 0) events = root.querySelectorAll(".cal-event");
  if (events.length === 0) events = root.querySelectorAll(".cal-card");

  return events.map((ev) => {
    const classList = ev.classNames.split(/\s+/).filter(Boolean);
    // Try every known time/title/meta class
    const time =
      ev.querySelector(".event-time")?.text?.trim() ??
      ev.querySelector(".cal-time")?.text?.trim() ??
      ev.querySelector(".time")?.text?.trim() ?? "";
    const titleEl =
      ev.querySelector(".event-title") ??
      ev.querySelector(".cal-title") ??
      ev.querySelector(".title");
    const badge =
      titleEl?.querySelector(".badge")?.text?.trim() ??
      titleEl?.querySelector(".conflict-badge")?.text?.trim() ??
      ev.querySelector(".warn-tag")?.text?.trim() ?? null;
    const title = titleEl
      ? titleEl.text.replace(badge ?? "", "").trim()
      : "";
    const metaEls = ev.querySelectorAll(".event-meta");
    const calMetaEls = ev.querySelectorAll(".cal-meta");
    const metas = metaEls.length > 0
      ? metaEls.map((m) => m.text.trim())
      : calMetaEls.length > 0
      ? calMetaEls.map((m) => m.text.trim())
      : ev.querySelectorAll(".detail").map((m) => m.text.trim());
    return {
      time,
      title,
      meta: metas,
      badge,
      classes: classList.filter((c) => !["event", "cal-event", "cal-card"].includes(c)),
    };
  });
}

function extractSignals(root: HTMLElement): ClientSignal[] {
  // Support both old (.signal) and new (.email-item) briefing formats
  const signals = root.querySelectorAll(".signal");
  if (signals.length > 0) {
    return signals.map((s) => {
      const classList = s.classNames.split(/\s+/).filter(Boolean);
      const urgency: ClientSignal["urgency"] = classList.includes("urgent")
        ? "urgent"
        : classList.includes("waiting")
        ? "waiting"
        : classList.includes("info")
        ? "info"
        : "default";
      const titleEl = s.querySelector(".signal-title");
      const badge = titleEl?.querySelector(".badge")?.text?.trim() ?? null;
      return {
        title: titleEl
          ? titleEl.text.replace(badge ?? "", "").trim()
          : "",
        detail: s.querySelector(".signal-detail")?.text?.trim() ?? "",
        action: s.querySelector(".signal-action")?.text?.trim() ?? "",
        urgency,
        badge,
      };
    });
  }

  // New format: .email-item with .from, .subject, .snippet
  const emailItems = root.querySelectorAll(".email-item");
  return emailItems.map((item) => {
    const from =
      item.querySelector(".from")?.text?.trim() ??
      item.querySelector(".email-meta")?.text?.trim() ?? "";
    const subject =
      item.querySelector(".subject")?.text?.trim() ??
      item.querySelector(".email-subject")?.text?.trim() ?? "";
    const snippet =
      item.querySelector(".snippet")?.text?.trim() ??
      item.querySelector(".email-snippet")?.text?.trim() ?? "";
    const dateBadge = item.querySelector(".date-badge")?.text?.trim() ?? null;
    return {
      title: subject || from,
      detail: snippet,
      action: "",
      urgency: "info" as const,
      badge: dateBadge,
    };
  });
}

function extractProjects(root: HTMLElement): ProjectCard[] {
  const cards = root.querySelectorAll(".project-card");
  return cards.map((card) => {
    const classList = card.classNames.split(/\s+/).filter(Boolean);
    const heat: ProjectCard["heat"] = classList.includes("hot")
      ? "hot"
      : classList.includes("active")
      ? "active"
      : classList.includes("warm")
      ? "warm"
      : classList.includes("client")
      ? "client"
      : classList.includes("stale") || classList.includes("border-stale")
      ? "stale"
      : "normal";

    // Staleness — try every known class: .project-staleness, .age-badge, .days-tag
    const stalenessEl =
      card.querySelector(".project-staleness") ??
      card.querySelector(".age-badge") ??
      card.querySelector(".days-tag") ??
      card.querySelector(".staleness-badge");
    const stalenessText = stalenessEl?.text?.trim() ?? "";
    const stalenessClasses = stalenessEl?.classNames ?? "";
    const stalenessLevel: ProjectCard["stalenessLevel"] =
      stalenessClasses.includes("staleness-fresh") || stalenessClasses.includes("age-fresh") || stalenessClasses.includes("days-fresh") || stalenessClasses.includes("badge-fresh")
        ? "fresh"
        : stalenessClasses.includes("staleness-recent") || stalenessClasses.includes("age-ok") || stalenessClasses.includes("days-ok") || stalenessClasses.includes("badge-med")
        ? "recent"
        : stalenessClasses.includes("staleness-old") || stalenessClasses.includes("age-stale") || stalenessClasses.includes("age-old") || stalenessClasses.includes("days-stale") || stalenessClasses.includes("badge-stale")
        ? "old"
        : "unknown";

    // Sections — try structured containers first, then fall back to
    // flat .proj-label + .proj-value siblings (v3 briefing format)
    let sections = card.querySelectorAll(".project-section").map((sec) => ({
      label: sec.querySelector("label")?.text?.trim() ?? "",
      text: sec.querySelector("p")?.text?.trim() ?? "",
    }));
    if (sections.length === 0) {
      sections = card.querySelectorAll(".proj-row").map((sec) => ({
        label: sec.querySelector(".proj-label")?.text?.trim() ?? "",
        text: sec.querySelector(".proj-text")?.text?.trim() ??
              sec.querySelector(".proj-action")?.text?.trim() ?? "",
      }));
    }
    if (sections.length === 0) {
      // v3: flat .proj-label elements followed by .proj-value siblings
      const labels = card.querySelectorAll(".proj-label");
      sections = labels.map((lbl) => {
        const next = lbl.nextElementSibling;
        const text = next?.text?.trim() ?? "";
        return { label: lbl.text.trim(), text };
      });
    }
    if (sections.length === 0) {
      // current briefing format: .project-focus with <strong> label inline
      const focusEl = card.querySelector(".project-focus");
      if (focusEl) {
        const label = focusEl.querySelector("strong")?.text?.trim() ?? "Focus";
        const text = focusEl.text.replace(label, "").trim();
        sections = [{ label, text }];
      }
    }

    return {
      name: card.querySelector(".project-name")?.text?.trim() ??
            card.querySelector(".proj-name")?.text?.trim() ?? "",
      staleness: stalenessText,
      stalenessLevel,
      heat,
      sections,
      nextAction: card.querySelector(".project-next")?.text?.trim() ??
                  card.querySelector(".proj-next")?.text?.trim() ??
                  card.querySelector(".proj-action")?.text?.trim() ?? null,
    };
  });
}

function extractInbox(
  root: HTMLElement
): { items: InboxItem[]; empty: boolean } {
  const emptyEl = root.querySelector(".inbox-empty");
  if (emptyEl) return { items: [], empty: true };
  // New format: .inbox-item with .inbox-text
  const items = root.querySelectorAll(".inbox-item");
  if (items.length > 0) {
    return {
      items: items.map((item) => ({
        text: item.querySelector(".inbox-text")?.text?.trim() ?? item.text.trim(),
      })),
      empty: false,
    };
  }
  return { items: [], empty: true };
}

function extractActionStack(root: HTMLElement): ActionStack {
  // The action stack is a card with "Action Stack" in h2.
  // It has three inline columns, each with a heading div and a ul.
  const cards = root.querySelectorAll(".card");
  let actionCard: HTMLElement | null = null;
  for (const c of cards) {
    const h2 = c.querySelector("h2");
    if (h2 && h2.text.includes("Action Stack")) {
      actionCard = c;
      break;
    }
  }
  if (!actionCard) return { mustDo: [], meetings: [], watching: [] };

  const uls = actionCard.querySelectorAll("ul");
  const extractItems = (ul: HTMLElement | undefined): string[] =>
    ul
      ? ul
          .querySelectorAll("li")
          .map((li) => li.text.trim())
      : [];

  return {
    mustDo: extractItems(uls[0]),
    meetings: extractItems(uls[1]),
    watching: extractItems(uls[2]),
  };
}
