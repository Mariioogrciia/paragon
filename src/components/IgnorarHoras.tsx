"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { EyeOff, RotateCcw } from "lucide-react";
import { setHorasIgnoradasAction } from "@/app/actions";

/**
 * "No he jugado esto: ignorar horas" en la ficha de un juego propio — ver
 * lib/horasIgnoradas.ts. PSN y Steam atribuyen las horas a la cuenta, no a
 * la persona, así que alguien que juega con tu cuenta te las "regala".
 */
export function IgnorarHoras({ gameId, minutos, ignoradas: inicial }: { gameId: string; minutos: number; ignoradas: boolean }) {
  const t = useTranslations("Biblioteca.IgnorarHoras");
  const [ignoradas, setIgnoradas] = useState(inicial);
  const [pendiente, startTransition] = useTransition();
  const horas = Math.round(minutos / 60).toLocaleString("es-ES");

  function alternar() {
    const nuevo = !ignoradas;
    setIgnoradas(nuevo);
    startTransition(() => setHorasIgnoradasAction(gameId, nuevo));
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm">
        {ignoradas ? t("ignoradas", { horas }) : t("segunPlataforma", { horas })}
      </p>
      <p className="mt-1 text-xs text-muted">{t("explicacion")}</p>
      <button
        type="button"
        disabled={pendiente}
        onClick={alternar}
        className="mt-3 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-accent hover:text-[var(--accent-text)] disabled:opacity-50"
      >
        {ignoradas ? <RotateCcw size={13} /> : <EyeOff size={13} />}
        {ignoradas ? t("volverAContar") : t("ignorar")}
      </button>
    </section>
  );
}
