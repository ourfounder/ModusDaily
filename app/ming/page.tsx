import Link from "next/link";
import MingPomodoroDial from "@/components/ming/PomodoroDial";
import MingKanbanRail from "@/components/ming/KanbanRail";
import MingContextRail from "@/components/ming/ContextRail";
import MingActiveCard from "@/components/ming/ActiveCard";
import { CardsProvider } from "@/lib/CardsContext";

/**
 * ModusDaily — Ming Zhao variant.
 *
 * Same three-column wall-display layout as `/` (kanban · dial · context),
 * but rendered in Ming&rsquo;s language: warm umber bg, brass amber accents,
 * serif numerals, Futura labels, quiet brass-plate controls.
 *
 * Same `usePomodoro` hook drives both variants — pause here, resume there.
 */
export default function MingHome() {
  return (
    <CardsProvider>
    <main
      style={{
        display: "grid",
        gridTemplateColumns: "380px 1fr 400px",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        color: "#e9dfce",
      }}
    >
      {/* Left rail — kanban shelves */}
      <aside
        style={{
          borderRight: "1px solid #2a241c",
          background: "#0c0a08",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            borderBottom: "1px solid #2a241c",
            padding: "1.4rem 1.8rem",
          }}
        >
          <div
            style={{
              fontFamily: "Futura, 'Trebuchet MS', sans-serif",
              fontSize: "0.78rem",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "#c48a3c",
            }}
          >
            ModusDaily
          </div>
          <Link
            href="/"
            style={{
              fontFamily: "Futura, 'Trebuchet MS', sans-serif",
              fontSize: "0.62rem",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#5b5143",
              textDecoration: "none",
            }}
          >
            &larr; Ops
          </Link>
        </header>
        <div style={{ padding: "0.2rem 1.8rem 2rem" }}>
          <MingKanbanRail />
        </div>
      </aside>

      {/* Center — dial + active card */}
      <section
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "2.4rem",
          padding: "3rem",
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(196, 138, 60, 0.05), transparent 60%), #0f0d0a",
        }}
      >
        <MingPomodoroDial />
        <MingActiveCard />
      </section>

      {/* Right rail — context as margin note */}
      <aside
        style={{
          borderLeft: "1px solid #2a241c",
          background: "#0c0a08",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            borderBottom: "1px solid #2a241c",
            padding: "1.4rem 1.8rem",
          }}
        >
          <div
            style={{
              fontFamily: "Futura, 'Trebuchet MS', sans-serif",
              fontSize: "0.62rem",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "#5b5143",
            }}
          >
            The Margin
          </div>
        </header>
        <div style={{ padding: "0.2rem 1.8rem 2rem" }}>
          <MingContextRail />
        </div>
      </aside>
    </main>
    </CardsProvider>
  );
}
