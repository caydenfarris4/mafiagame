"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md bg-surface-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-foreground transition hover:bg-border print:hidden"
    >
      Print sheet
    </button>
  );
}
