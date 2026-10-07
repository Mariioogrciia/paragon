"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { joinClanAction, leaveClanAction } from "../actions";

interface Props {
  clanId: string;
  amIMember: boolean;
  amIOwner: boolean;
  /** Tag del clan en el que ya estás (si es otro): en vez de "Unirme", el aviso. */
  otroClan?: string | null;
}

export function ClanActions({ clanId, amIMember, amIOwner, otroClan }: Props) {
  const t = useTranslations("Perfil.ClanPage");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await joinClanAction(clanId);
      if (r.error) setError(r.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al unirse");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (amIOwner && !confirm("Al ser el líder, si sales el clan desaparecerá. ¿Estás seguro?")) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await leaveClanAction(clanId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al salir");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {amIMember ? (
        <button
          onClick={handleLeave}
          disabled={loading}
          className="rounded-[10px] border border-red-500/50 text-red-500 hover:bg-red-500/10 px-6 py-2.5 font-bold disabled:opacity-50"
        >
          {loading ? "..." : "Abandonar Clan"}
        </button>
      ) : otroClan ? (
        <p className="max-w-xs rounded-[10px] border border-border bg-surface px-4 py-2.5 text-right text-sm text-muted">
          {t.rich("yaEnOtroClan", {
            tag: otroClan,
            enlace: (chunks) => (
              <Link href={`/clanes/${otroClan.toLowerCase()}`} className="font-bold text-foreground underline-offset-2 hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      ) : (
        <button
          onClick={handleJoin}
          disabled={loading}
          className="rounded-[10px] bg-accent text-background px-6 py-2.5 font-bold disabled:opacity-50 shadow-[0_0_15px_var(--accent)] hover:shadow-[0_0_25px_var(--accent)] transition-shadow"
        >
          {loading ? "..." : "Unirme a este Clan"}
        </button>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
