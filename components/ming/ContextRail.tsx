"use client";

/**
 * Ming variant of the context rail.
 *
 * The ops-display version runs as a tight right-rail. Ming renders
 * it as a final passage at the bottom of the page — like a colophon
 * or a margin note. Project state as literature, not dashboard.
 */

export default function MingContextRail() {
  return (
    <div style={{ paddingTop: "1.4rem" }}>
      <div
        style={{
          fontFamily: "Futura, 'Trebuchet MS', sans-serif",
          fontSize: "0.68rem",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: "#c48a3c",
          marginBottom: "0.4rem",
        }}
      >
        Selector
      </div>
      <h2
        style={{
          fontFamily: "Futura, 'Trebuchet MS', sans-serif",
          fontSize: "1.1rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontWeight: 700,
          margin: "0 0 0.3rem",
          color: "#e9dfce",
        }}
      >
        The Active Project
      </h2>
      <p
        style={{
          color: "#9a8f7a",
          fontStyle: "italic",
          margin: "0 0 1.8rem",
          fontSize: "0.92rem",
        }}
      >
        What you&rsquo;re holding when you&rsquo;re holding something today.
      </p>

      <section style={{ marginBottom: "1.8rem" }}>
        <h3
          style={{
            fontFamily: "Futura, 'Trebuchet MS', sans-serif",
            fontSize: "0.75rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#9a8f7a",
            margin: "0 0 0.5rem",
          }}
        >
          Current Focus
        </h3>
        <p style={{ margin: 0, color: "#e9dfce" }}>
          Phase 1 SOW — need to close out pricing section before Monday.
        </p>
      </section>

      <section style={{ marginBottom: "1.8rem" }}>
        <h3
          style={{
            fontFamily: "Futura, 'Trebuchet MS', sans-serif",
            fontSize: "0.75rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#9a8f7a",
            margin: "0 0 0.5rem",
          }}
        >
          Tensions
        </h3>
        <ul
          style={{
            margin: 0,
            paddingLeft: "1.2rem",
            color: "#9a8f7a",
            lineHeight: 1.7,
          }}
        >
          <li>Scope creep vs. timeboxed discovery.</li>
          <li>Five Sigma stakeholders not yet aligned on the success metric.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "1.8rem" }}>
        <h3
          style={{
            fontFamily: "Futura, 'Trebuchet MS', sans-serif",
            fontSize: "0.75rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#9a8f7a",
            margin: "0 0 0.5rem",
          }}
        >
          Open Questions
        </h3>
        <ul
          style={{
            margin: 0,
            paddingLeft: "1.2rem",
            color: "#9a8f7a",
            lineHeight: 1.7,
          }}
        >
          <li>Who is the executive sponsor on the Five Sigma side?</li>
          <li>Do we include coaching hours in the base price?</li>
        </ul>
      </section>

      <section>
        <h3
          style={{
            fontFamily: "Futura, 'Trebuchet MS', sans-serif",
            fontSize: "0.75rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#9a8f7a",
            margin: "0 0 0.5rem",
          }}
        >
          Promises
        </h3>
        <ul
          style={{
            margin: 0,
            paddingLeft: "1.2rem",
            color: "#9a8f7a",
            lineHeight: 1.7,
          }}
        >
          <li>SOW to Five Sigma by EOD Friday.</li>
        </ul>
      </section>

      <p
        style={{
          marginTop: "3rem",
          color: "#5b5143",
          fontStyle: "italic",
          fontSize: "0.82rem",
          textAlign: "center",
        }}
      >
        Placeholder — the KZ &ldquo;Context&rdquo; column pours in next.
      </p>
    </div>
  );
}
