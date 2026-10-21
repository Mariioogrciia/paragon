"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { EscudoClan, ICONO_SIMBOLO } from "@/components/EscudoClan";
import { COLORES, EMBLEMA_POR_DEFECTO, FORMAS, SIMBOLOS, TRAZADO_FORMA, emblemaATexto, textoAEmblema, type Emblema } from "@/lib/clanEmblema";
import { setEmblemaAction } from "../actions";

/**
 * Editor del escudo del clan, solo para el líder: forma, símbolo, color de
 * fondo y color del símbolo, con la vista previa en grande. Como en Clash of
 * Clans: piezas fijas que se combinan, nada de subir fotos.
 */
export function EditorEscudo({ clanId, inicial }: { clanId: string; inicial: string | null }) {
  const t = useTranslations("Perfil.ClanPage");
  const [abierto, setAbierto] = useState(false);
  const [e, setE] = useState<Emblema>(textoAEmblema(inicial) ?? EMBLEMA_POR_DEFECTO);
  const [error, setError] = useState("");
  const [guardando, startTransition] = useTransition();

  const guardar = () => {
    setError("");
    startTransition(async () => {
      const r = await setEmblemaAction(clanId, emblemaATexto(e));
      if (r.error) setError(t("escudoError"));
      else setAbierto(false);
    });
  };

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-[var(--accent)] hover:text-foreground"
      >
        {t("escudoEditar")}
      </button>
    );
  }

  const boton = (activo: boolean) =>
    `grid place-items-center rounded-xl border transition-colors ${activo ? "border-[var(--accent)] bg-surface-2" : "border-border bg-surface hover:border-muted hover:bg-surface-2"}`;

  return (
    <div className="mt-4 w-full max-w-xl rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-5">
        <EscudoClan emblema={e} size={96} />
        <div>
          <p className="font-heading text-lg font-bold">{t("escudoTitulo")}</p>
          <p className="text-sm text-muted">{t("escudoTexto")}</p>
        </div>
      </div>

      <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-muted">{t("escudoForma")}</p>
      <div className="flex flex-wrap gap-2">
        {FORMAS.map((f) => (
          <button key={f} type="button" aria-pressed={e.forma === f} onClick={() => setE({ ...e, forma: f })} className={`${boton(e.forma === f)} h-12 w-12`}>
            <svg viewBox="0 0 100 100" width={30} height={30} aria-hidden="true">
              <path d={TRAZADO_FORMA[f]} fill="currentColor" className="text-muted" />
            </svg>
          </button>
        ))}
      </div>

      <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-muted">{t("escudoSimbolo")}</p>
      <div className="flex flex-wrap gap-2">
        {SIMBOLOS.map((s) => {
          const Icono = ICONO_SIMBOLO[s];
          return (
            <button key={s} type="button" aria-pressed={e.simbolo === s} onClick={() => setE({ ...e, simbolo: s })} className={`${boton(e.simbolo === s)} h-12 w-12`}>
              <Icono className="h-6 w-6" />
            </button>
          );
        })}
      </div>

      {(["fondo", "color"] as const).map((campo) => (
        <div key={campo}>
          <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-muted">{campo === "fondo" ? t("escudoFondo") : t("escudoColor")}</p>
          <div className="flex flex-wrap gap-2">
            {COLORES.map((c, i) => (
              <button
                key={c}
                type="button"
                aria-pressed={e[campo] === i}
                aria-label={c}
                onClick={() => setE({ ...e, [campo]: i })}
                className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 ${e[campo] === i ? "border-foreground" : "border-transparent"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      ))}

      {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-background transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          style={{ background: "var(--accent-grad)" }}
        >
          {t("escudoGuardar")}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground">
          {t("escudoCancelar")}
        </button>
      </div>
    </div>
  );
}
