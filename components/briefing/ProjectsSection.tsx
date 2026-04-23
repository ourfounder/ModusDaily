"use client";

import CollapsibleSection from "@/components/CollapsibleSection";
import type { ProjectCard } from "@/lib/briefing/parseFullBriefing";

const heatBorders: Record<string, string> = {
  hot: "#c45a3c",
  active: "var(--short-break)",
  warm: "var(--accent)",
  client: "#6b9ac4",
  stale: "var(--ink-faint)",
  normal: "var(--border)",
};

const stalenessColors: Record<string, string> = {
  fresh: "var(--short-break)",
  recent: "var(--accent)",
  old: "#c45a3c",
  unknown: "var(--ink-faint)",
};

export default function ProjectsSection({ projects }: { projects: ProjectCard[] }) {
  const sorted = [...projects].sort((a, b) => {
    const order = ["hot", "active", "warm", "client", "normal", "stale"];
    return order.indexOf(a.heat) - order.indexOf(b.heat);
  });

  return (
    <CollapsibleSection
      id="projects"
      title="Project State"
      badge={projects.length}
      accentColor="var(--short-break)"
      defaultOpen={false}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {sorted.map((p, i) => (
          <div
            key={i}
            style={{
              borderRadius: 4,
              border: "1px solid var(--border)",
              borderTop: `2px solid ${heatBorders[p.heat] ?? "var(--border)"}`,
              background: "rgba(15, 13, 10, 0.4)",
              padding: "0.6rem 0.75rem",
              opacity: p.heat === "stale" ? 0.6 : 1,
            }}
          >
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--ink)" }}>
              {p.name}
            </div>
            <div style={{ fontSize: "0.6rem", color: stalenessColors[p.stalenessLevel] }}>
              {p.staleness}
            </div>
            {p.sections.map((sec, j) => (
              <div key={j} style={{ marginTop: "0.4rem" }}>
                <div
                  style={{
                    fontFamily: '"Futura", "Trebuchet MS", sans-serif',
                    fontSize: "0.55rem",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--ink-faint)",
                  }}
                >
                  {sec.label}
                </div>
                <div style={{ fontSize: "0.7rem", lineHeight: 1.5, color: "var(--ink-dim)" }}>
                  {sec.text}
                </div>
              </div>
            ))}
            {p.nextAction && (
              <div
                style={{
                  marginTop: "0.4rem",
                  borderRadius: 3,
                  background: "rgba(138, 154, 107, 0.08)",
                  borderLeft: "2px solid var(--short-break)",
                  padding: "0.3rem 0.5rem",
                  fontSize: "0.7rem",
                  fontWeight: 500,
                  color: "var(--short-break)",
                }}
              >
                {p.nextAction}
              </div>
            )}
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}
