"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Swords } from "lucide-react";
import { responderGuerraAction, retarClanAction } from "../actions";
import { Selector } from "@/components/ui/Selector";

interface Rival {
  id: string;
  name: string;
  tag: string;
}

interface Guerra {
  id: string;
  estado: string;
  soyRetador: boolean;
  rival: Rival;
  terminaAt: string | null;
  /** Calculado en el servidor: `Date.now()` en el render de un componente de cliente no es puro. */
  diasRestantes: number | null;
  misPuntos: number | null;
  susPuntos: number | null;
  gane: boolean | null;
}

/**
 * Sección "Guerra de clanes" de la página de un clan — ver lib/clanWars.ts.
 * Textos en `Perfil.ClanPage.guerra`.
 */
export function GuerraDeClanes({
  clanId,
  clanTag,
  soyLider,
  abierta,
  historial,
  retables,
  duracionDias,
}: {
  clanId: string;
  clanTag: string;
  soyLider: boolean;
  abierta: Guerra | null;
  historial: Guerra[];
  retables: Rival[];
  duracionDias: number;
}) {
  const t = useTranslations("Perfil.ClanPage.guerra");
  const [rivalId, setRivalId] = useState(retables[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function ejecutar(accion: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await accion();
      if (r.error) setError(r.error);
    });
  }

  const diasRestantes = abierta?.diasRestantes ?? null;

  return (
    <section className="rounded-[18px] border border-border bg-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-2xl font-bold">
        <Swords size={22} className="text-[var(--accent-text)]" /> {t("titulo")}
      </h2>

      {abierta?.estado === "activa" && (
        <div className="mt-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">[{clanTag}]</p>
              <p className="font-heading text-4xl font-bold tabular-nums text-[var(--accent-text)]">{abierta.misPuntos ?? 0}</p>
            </div>
            <span className="font-heading text-lg font-bold text-muted">VS</span>
            <div>
              <Link href={`/clanes/${abierta.rival.tag.toLowerCase()}`} className="text-xs font-bold uppercase tracking-wider text-muted hover:text-[var(--accent-text)]">
                [{abierta.rival.tag}]
              </Link>
              <p className="font-heading text-4xl font-bold tabular-nums">{abierta.susPuntos ?? 0}</p>
            </div>
          </div>
          <p className="mt-3 text-center text-sm text-muted" suppressHydrationWarning>
            {diasRestantes === 0 ? t("terminaHoy") : t("quedan", { n: diasRestantes ?? 0 })} · {t("puntos")}
          </p>
        </div>
      )}

      {abierta?.estado === "pendiente" && (
        <div className="mt-4">
          {abierta.soyRetador ? (
            <p className="text-sm text-muted">
              {t.rich("habeisRetado", {
                tag: abierta.rival.tag,
                nombre: abierta.rival.name,
                b: (chunks) => <strong className="text-foreground">{chunks}</strong>,
              })}
            </p>
          ) : (
            <>
              <p className="text-sm">
                {t.rich("osReta", {
                  tag: abierta.rival.tag,
                  nombre: abierta.rival.name,
                  dias: duracionDias,
                  b: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
              {soyLider ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() => ejecutar(() => responderGuerraAction(abierta.id, true))}
                    className="rounded-lg px-4 py-2 text-sm font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb)/0.4)] disabled:opacity-50"
                    style={{ background: "var(--accent-grad)" }}
                  >
                    {t("aceptar")}
                  </button>
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() => ejecutar(() => responderGuerraAction(abierta.id, false))}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-danger/50 hover:text-danger disabled:opacity-50"
                  >
                    {t("rechazar")}
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted">{t("loAceptaLider")}</p>
              )}
            </>
          )}
        </div>
      )}

      {!abierta && (
        <div className="mt-4">
          <p className="text-sm text-muted">
            {t("explicacion", { dias: duracionDias })}
          </p>
          {soyLider && retables.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Selector
                value={rivalId}
                onChange={setRivalId}
                ariaLabel={t("clanARetar")}
                className="min-w-0 flex-1"
                options={retables.map((c) => ({ value: c.id, label: c.name, detalle: `[${c.tag}]` }))}
              />
              <button
                type="button"
                disabled={pendiente || !rivalId}
                onClick={() => ejecutar(() => retarClanAction(clanId, rivalId))}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb)/0.4)] disabled:opacity-50"
                style={{ background: "var(--accent-grad)" }}
              >
                <Swords size={14} /> {t("retar")}
              </button>
            </div>
          )}
          {soyLider && retables.length === 0 && <p className="mt-2 text-xs text-muted">{t("sinRivales")}</p>}
        </div>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}

      {historial.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{t("anteriores")}</p>
          <ul className="grid gap-1.5">
            {historial.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">
                  vs <strong>[{g.rival.tag}]</strong> {g.rival.name}
                </span>
                <span className="shrink-0 font-mono">
                  {g.misPuntos ?? 0}–{g.susPuntos ?? 0}{" "}
                  <span className={g.gane === true ? "text-good" : g.gane === false ? "text-danger" : "text-muted"}>
                    {g.gane === true ? t("victoria") : g.gane === false ? t("derrota") : t("empate")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
