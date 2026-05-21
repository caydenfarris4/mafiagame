"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }
      router.push(next || data.redirect || "/play");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm uppercase tracking-widest text-muted">
          Your secret code
        </span>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. HANK-01"
          autoComplete="off"
          autoCapitalize="characters"
          className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-lg tracking-widest text-foreground outline-none focus:border-accent"
        />
      </label>

      {error && (
        <p className="rounded-md border border-accent-soft bg-accent-soft/20 px-3 py-2 text-sm text-foreground">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || code.trim() === ""}
        className="rounded-lg bg-accent px-4 py-3 font-semibold uppercase tracking-wide text-white transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Entering…" : "Enter the house"}
      </button>
    </form>
  );
}
