"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-ghost print:hidden"
    >
      Print sheet
    </button>
  );
}
