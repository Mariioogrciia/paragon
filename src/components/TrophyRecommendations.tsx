import Link from "next/link";
import { TrophyTile } from "@/components/TrophyIcon";
import type { TrophyRecommendation } from "@/lib/recommendations";

export function TrophyRecommendations({ recommendations, handle }: { recommendations: TrophyRecommendation[]; handle: string }) {
  return (
    <section className="rounded-[18px] border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div><h2 className="font-heading text-xl font-bold uppercase tracking-wide">Siguiente trofeo</h2><p className="mt-1 text-sm text-muted">Prioridad automática: progreso alto y mayor probabilidad de conseguirlo.</p></div>
        <Link href={`/u/${handle}`} className="text-xs font-bold uppercase tracking-wide text-accent hover:underline">Ver biblioteca</Link>
      </div>
      {recommendations.length === 0 ? <p className="text-sm text-muted">Sin recomendaciones todavía. Sincroniza el detalle de algún juego para conocer sus trofeos.</p> : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{recommendations.map((recommendation) => <Link key={`${recommendation.gameId}:${recommendation.trophyId}`} href={`/u/${handle}/${recommendation.gameId}`} className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-surface-2"><TrophyTile grade="gold" size={38} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{recommendation.trophyName}</span><span className="mt-1 block truncate text-xs text-muted">{recommendation.gameTitle} · {recommendation.gameProgress}% completado</span></span><span className="shrink-0 text-xs font-bold text-good">{recommendation.rarityPercent?.toFixed(1)}%</span></Link>)}</div>}
    </section>
  );
}
