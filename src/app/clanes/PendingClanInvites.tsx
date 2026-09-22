"use client";

import { useState } from "react";
import { acceptClanInviteAction, declineClanInviteAction } from "./actions";

interface Invite {
  clanId: string;
  clanName: string;
  clanTag: string;
  invitedByName: string | null;
  invitedByHandle: string | null;
}

export function PendingClanInvites({ invites }: { invites: Invite[] }) {
  const [resueltas, setResueltas] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState("");

  const visibles = invites.filter((i) => !resueltas.has(i.clanId));
  if (visibles.length === 0) return null;

  async function resolver(clanId: string, accion: "aceptar" | "rechazar") {
    setCargando(clanId);
    setError("");
    try {
      if (accion === "aceptar") await acceptClanInviteAction(clanId);
      else await declineClanInviteAction(clanId);
      setResueltas((prev) => new Set(prev).add(clanId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo procesar la invitación");
    } finally {
      setCargando(null);
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-[var(--accent)] bg-[var(--accent-rgb)]/5 p-5">
      <h2 className="mb-3 font-bold">Te han invitado a un clan</h2>
      {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
      <div className="flex flex-col gap-2.5">
        {visibles.map((inv) => (
          <div key={inv.clanId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3.5">
            <p className="text-sm">
              <span className="font-bold text-[var(--accent-text)]">[{inv.clanTag}] {inv.clanName}</span>
              {" — invitado por "}
              <span className="font-semibold">{inv.invitedByName ?? inv.invitedByHandle}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => resolver(inv.clanId, "aceptar")}
                disabled={cargando === inv.clanId}
                className="rounded-[10px] bg-accent px-3.5 py-1.5 text-xs font-bold text-background disabled:opacity-50"
              >
                Unirme
              </button>
              <button
                onClick={() => resolver(inv.clanId, "rechazar")}
                disabled={cargando === inv.clanId}
                className="rounded-[10px] border border-border px-3.5 py-1.5 text-xs font-bold text-muted hover:text-foreground disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
