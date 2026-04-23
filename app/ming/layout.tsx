import "./ming.css";

/**
 * Ming variant layout — wraps the route group in `.ming-root` so all
 * the warm-umber tokens scoped in `ming.css` apply only here. Outside
 * this subtree, the default ops-display palette on `/` is unaffected.
 */
export default function MingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ming-root">
      <div className="ming-bg">{children}</div>
    </div>
  );
}
