import MingPomodoroDial from "@/components/ming/PomodoroDial";

/**
 * Ming-variant standalone timer — the dial alone on the page,
 * centered. For when you want to watch it and nothing else.
 */
export default function MingTimerOnly() {
  return (
    <main
      className="ming-shell"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        paddingTop: "3rem",
        paddingBottom: "3rem",
      }}
    >
      <MingPomodoroDial />
    </main>
  );
}
