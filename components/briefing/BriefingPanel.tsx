"use client";

import SignalsSection from "./SignalsSection";
import ProjectsSection from "./ProjectsSection";
import type { BriefingData } from "@/lib/briefing/parseFullBriefing";

/**
 * Briefing sections panel — signals + projects.
 * Calendar is rendered separately at higher level for prominence.
 * Action stack removed — the kanban IS the action stack now.
 * Accepts parsed briefing data as prop to avoid double-fetching.
 */
export default function BriefingPanel({ data }: { data: BriefingData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <SignalsSection signals={data.signals} />
      <ProjectsSection projects={data.projects} />
    </div>
  );
}
