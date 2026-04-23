import PomodoroDial from "@/components/PomodoroDial";

/**
 * Standalone timer demo page — isolate the dial's aesthetic before wiring it
 * into the kanban + context shell. Full-screen, centered, dark ambient bg.
 *
 * View at http://localhost:3000/timer
 */
export default function TimerPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b1020] text-slate-100">
      <PomodoroDial />
    </main>
  );
}
