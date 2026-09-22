"use client";

import { useState } from "react";
import { joinClanAction, leaveClanAction } from "../actions";

interface Props {
  clanId: string;
  amIMember: boolean;
  amIOwner: boolean;
}

export function ClanActions({ clanId, amIMember, amIOwner }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    setLoading(true);
    setError("");
    try {
      await joinClanAction(clanId);
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
      ) : (
        <button
          onClick={handleJoin}
          disabled={loading}
          className="rounded-[10px] bg-[var(--accent)] text-[var(--accent-text-contrast)] px-6 py-2.5 font-bold disabled:opacity-50 shadow-[0_0_15px_var(--accent)] hover:shadow-[0_0_25px_var(--accent)] transition-shadow"
        >
          {loading ? "..." : "Unirme a este Clan"}
        </button>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
