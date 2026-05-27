"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function WaitingRoom({
  personaName,
  initialStatus,
}: {
  personaName: string;
  initialStatus: "PENDING" | "BLOCKED";
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"PENDING" | "BLOCKED">(initialStatus);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/play/access", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { status: string };
      if (data.status === "APPROVED") {
        router.refresh(); // server re-renders /play and shows the board
      } else if (data.status === "BLOCKED") {
        setStatus("BLOCKED");
      } else if (data.status === "PENDING") {
        setStatus("PENDING");
      } else {
        router.push("/"); // session gone — back to the door
      }
    } catch {
      /* transient — keep waiting */
    }
  }, [router]);

  useEffect(() => {
    const kick = setTimeout(check, 0);
    const t = setInterval(check, 5000);
    return () => {
      clearTimeout(kick);
      clearInterval(t);
    };
  }, [check]);

  const blocked = status === "BLOCKED";

  return (
    <div className="card-noir flex flex-col items-center gap-4 p-8 text-center">
      <span
        className="pill"
        style={
          blocked
            ? { color: "var(--blood)", borderColor: "var(--blood-dim)" }
            : { color: "var(--brass)", borderColor: "var(--brass-dim)" }
        }
      >
        {blocked ? "Access closed" : (
          <>
            <span className="dot" /> Waiting for the host
          </>
        )}
      </span>

      <h2 className="display text-2xl text-foreground">
        {blocked ? "You're not in this game" : "Hang tight, the host is checking you in"}
      </h2>

      <p className="max-w-sm text-sm text-text-dim" style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}>
        {blocked
          ? `Alex hasn't admitted this device for ${personaName}. If you're with the family, ask him to let you in from his dashboard.`
          : `Alex needs to confirm it's really you playing ${personaName}. Once he taps approve, this page opens on its own — keep it open.`}
      </p>

      {!blocked && (
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          Checking every few seconds…
        </p>
      )}
    </div>
  );
}
