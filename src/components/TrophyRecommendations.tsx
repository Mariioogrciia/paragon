"use client";

import { useState } from "react";
import Link from "next/link";
import { TrophyTile } from "@/components/TrophyIcon";
import { TrophyGuideModal } from "@/components/TrophyGuideModal";
import type { TrophyRecommendation } from "@/lib/recommendations";
import type { Trophy } from "@/lib/types";

export function TrophyRecommendations({
  recommendations,
  handle,
  showcaseTrophies = [],
}: {
  recommendations: TrophyRecommendation[];
  handle: string;
  /** Lo que ya tienes anclado en la Vitrina de Orgullo, para saber qué botón mostrar. */
  showcaseTrophies?: { gameId: string; trophyId: string }[];
}) {
  // La recomendación activa, para abrirle la guía de vídeo — el mismo modal
  // que ya usa la ficha de cada juego (TrophyGuideModal), con el mismo botón
  // de anclar que ya tiene ese modal: no hacía falta inventar un segundo
  // sitio para fijar un trofeo, solo enchufarlo aquí también.
  const [activa, setActiva] = useState<TrophyRecommendation | null>(null);

  const trofeoDeRecomendacion = (r: TrophyRecommendation): Trophy => ({
    id: r.trophyId,
    name: r.trophyName,
    detail: r.detail,
    earned: false,
    rarityPercent: r.rarityPercent ?? undefined,
  });

  return (
    <section className="rounded-[18px] border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl font-bold uppercase tracking-wide">Siguiente trofeo</h2>
          <p className="mt-1 text-sm text-muted">
            Prioridad automática: primero el juego base (el platino nunca depende del DLC), progreso alto y mayor probabilidad de conseguirlo.
          </p>
        </div>
        <Link href={`/u/${handle}`} className="text-xs font-bold uppercase tracking-wide text-accent hover:underline">Ver biblioteca</Link>
      </div>

      {recommendations.length === 0 ? (
        <p className="text-sm text-muted">Sin recomendaciones todavía. Sincroniza el detalle de algún juego para conocer sus trofeos.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {recommendations.map((r) => (
            <div
              key={`${r.gameId}:${r.trophyId}`}
              className="flex min-w-0 items-center gap-2 rounded-xl border border-border p-3 transition-colors hover:bg-surface-2"
            >
              <Link href={`/u/${handle}/${r.gameId}`} className="flex min-w-0 flex-1 items-center gap-3">
                <TrophyTile grade="gold" size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{r.trophyName}</span>
                  <span className="mt-1 block truncate text-xs text-muted">{r.gameTitle} · {r.gameProgress}% completado</span>
                </span>
              </Link>
              <span className="shrink-0 text-xs font-bold text-good">{r.rarityPercent?.toFixed(1)}%</span>

              <button
                onClick={() => setActiva(r)}
                title="Ver guía en vídeo y anclar"
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/10 hover:text-foreground"
                style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </button>

              <Link
                href={`/juego/${encodeURIComponent(r.gameId)}/guias`}
                title="Guías escritas de este juego"
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/10 hover:text-foreground"
                style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      )}

      {activa && (
        <TrophyGuideModal
          gameTitle={activa.gameTitle}
          gameId={activa.gameId}
          trophy={trofeoDeRecomendacion(activa)}
          esMio
          isPinned={showcaseTrophies.some((t) => t.gameId === activa.gameId && t.trophyId === activa.trophyId)}
          onClose={() => setActiva(null)}
        />
      )}
    </section>
  );
}
