"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Game } from "@/lib/types";
import { coverGradient } from "@/lib/design";

/** Cuenta de 0 al valor real en ~700ms al montar — mismo criterio que el
 * contador del Paragon Score y las barras de progreso del Panel en
 * Android: un número que aparece ya hecho se lee, pero contarlo hace que
 * el ojo se pare un segundo justo donde interesa. */
function useCountUp(target: number, durationMs = 700): number {
  const [valor, setValor] = useState(0);
  useEffect(() => {
    let inicio: number | null = null;
    let frame: number;
    function paso(t: number) {
      if (inicio === null) inicio = t;
      const progreso = Math.min(1, (t - inicio) / durationMs);
      setValor(Math.round(progreso * target));
      if (progreso < 1) frame = requestAnimationFrame(paso);
    }
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return valor;
}

/**
 * Banner del "objetivo actual" en el perfil — el juego que su dueño ha
 * anclado (ver `togglePinGameAction`). Deliberadamente FUERA de las
 * secciones reordenables de `profileSections.ts`: es un aviso de "esto es
 * lo que estoy jugando AHORA", tiene sentido que sea siempre lo primero que
 * se ve, no algo que se pueda enterrar reordenando. Se pinta igual para el
 * dueño que para quien visita — es precisamente a la visita a quien va
 * dirigido el aviso.
 */
export function PinnedGameBanner({
  game,
  handle,
  aura,
}: {
  game: Game;
  handle: string;
  /** "Game Aura" — color dominante de la carátula (`lib/coverAura.ts`),
   * `null` sin calcular todavía o si no se pudo. Solo tiñe un halo de
   * fondo detrás del degradado dorado de siempre — el dorado se queda
   * igual (significa "esto lo elegiste tú", no un cálculo), el aura solo
   * añade la atmósfera propia de ESTE juego. */
  aura?: string | null;
}) {
  const t = useTranslations("Biblioteca");
  const href = `/u/${handle}/${game.id}`;
  const faltan = Math.max(0, game.definedTotal - game.earnedTotal);
  const porcentaje = useCountUp(game.progressPercent);
  // Barra de progreso propia (antes no había ninguna en este banner, solo
  // el aro con el número) — se anima igual que el número, de 0 al valor
  // real, en vez de aparecer ya llena.
  const [anchoBarra, setAnchoBarra] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnchoBarra(game.progressPercent));
    return () => cancelAnimationFrame(id);
  }, [game.progressPercent]);

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 overflow-hidden rounded-2xl p-4 transition-all hover:-translate-y-0.5"
      style={{
        border: "1px solid rgba(255, 255, 255, 0.10)",
        background: aura
          ? `linear-gradient(145deg, rgba(226,181,62,0.14), rgba(226,181,62,0.02) 45%, transparent 70%), radial-gradient(circle at 100% 0%, ${aura}2e, transparent 65%), var(--surface)`
          : "linear-gradient(145deg, rgba(226,181,62,0.14), rgba(226,181,62,0.03) 45%, var(--surface))",
        boxShadow: "0 0 0 1px rgba(226, 181, 62, 0.12), 0 12px 32px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl"
        style={{ background: coverGradient(game.id) }}
      >
        {game.iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.iconUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.08em]"
          style={{ color: "#e2b53e" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17v5" />
            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
          </svg>
          {t("PinnedGameBanner.currentTarget")}
        </p>
        <p className="mt-0.5 truncate font-heading text-lg font-bold">{game.title}</p>
        <p className="mt-0.5 text-xs text-muted">
          {/* Antes decía "¡a un paso!" también con 0 restantes — sonaba a
              que faltaba uno, no a que ya estaba platinado del todo (mismo
              bug real que en la Hero Card de Android). */}
          {t("PinnedGameBanner.status", {
            percent: porcentaje,
            hasRemaining: faltan > 0 ? "yes" : "no",
            remaining: faltan,
          })}
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${anchoBarra}%`, background: "#e2b53e" }}
          />
        </div>
      </div>

      <div
        className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold sm:flex"
        style={{ border: "3px solid rgba(226, 181, 62, 0.4)", color: "#e2b53e" }}
      >
        {porcentaje}%
      </div>
    </Link>
  );
}
