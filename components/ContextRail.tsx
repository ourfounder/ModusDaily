"use client";

/**
 * Right-rail context panel. Placeholder content for the shell.
 * Will be populated from the KZ "Context" column — one card per project,
 * with focus / tensions / open-questions / promises in the description.
 */

export default function ContextRail() {
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6 text-sm text-slate-300">
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-indigo-300">
          Active project
        </div>
        <h3 className="text-xl font-semibold text-slate-100">Selector</h3>
      </div>

      <section>
        <h4 className="mb-2 text-xs uppercase tracking-widest text-slate-500">
          Current focus
        </h4>
        <p className="leading-relaxed text-slate-300">
          Phase 1 SOW — need to close out pricing section before Monday.
        </p>
      </section>

      <section>
        <h4 className="mb-2 text-xs uppercase tracking-widest text-slate-500">
          Tensions
        </h4>
        <ul className="list-disc space-y-1 pl-5 text-slate-400">
          <li>Scope creep vs. timeboxed discovery</li>
          <li>Five Sigma stakeholders not yet aligned on success metric</li>
        </ul>
      </section>

      <section>
        <h4 className="mb-2 text-xs uppercase tracking-widest text-slate-500">
          Open questions
        </h4>
        <ul className="list-disc space-y-1 pl-5 text-slate-400">
          <li>Who is the executive sponsor on the Five Sigma side?</li>
          <li>Do we include coaching hours in the base price?</li>
        </ul>
      </section>

      <section>
        <h4 className="mb-2 text-xs uppercase tracking-widest text-slate-500">
          Promises
        </h4>
        <ul className="list-disc space-y-1 pl-5 text-slate-400">
          <li>SOW to Five Sigma by EOD Friday</li>
        </ul>
      </section>

      <div className="mt-auto pt-6 text-[10px] uppercase tracking-[0.25em] text-slate-600">
        Placeholder — wires to KZ Context column next
      </div>
    </div>
  );
}
