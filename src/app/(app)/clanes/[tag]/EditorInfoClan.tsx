"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { editarClanAction } from "../actions";

/** Nombre y descripción del clan, para el líder y los colíderes (lib/clanRangos.ts). */
export function EditorInfoClan({ clanId, nombre, descripcion }: { clanId: string; nombre: string; descripcion: string }) {
  const t = useTranslations("Perfil.ClanPage");
  const [abierto, setAbierto] = useState(false);
  const [name, setName] = useState(nombre);
  const [description, setDescription] = useState(descripcion);
  const [error, setError] = useState("");
  const [guardando, startTransition] = useTransition();

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-[var(--accent)] hover:text-foreground"
      >
        {t("editarInfo")}
      </button>
    );
  }

  const guardar = () => {
    setError("");
    startTransition(async () => {
      const r = await editarClanAction(clanId, name, description);
      if (r.error) setError(r.error);
      else setAbierto(false);
    });
  };

  return (
    <div className="mt-4 w-full max-w-xl rounded-2xl border border-border bg-surface p-5">
      <label className="block text-xs font-bold uppercase tracking-wider text-muted" htmlFor="clan-nombre">{t("campoNombre")}</label>
      <input
        id="clan-nombre"
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition-colors hover:border-muted focus:border-[var(--accent)]"
      />
      <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-muted" htmlFor="clan-descripcion">{t("campoDescripcion")}</label>
      <textarea
        id="clan-descripcion"
        value={description}
        maxLength={200}
        rows={3}
        onChange={(e) => setDescription(e.target.value)}
        className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition-colors hover:border-muted focus:border-[var(--accent)]"
      />
      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-background transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          style={{ background: "var(--accent-grad)" }}
        >
          {t("guardar")}
        </button>
        <button
          type="button"
          onClick={() => { setAbierto(false); setName(nombre); setDescription(descripcion); setError(""); }}
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          {t("escudoCancelar")}
        </button>
      </div>
    </div>
  );
}
