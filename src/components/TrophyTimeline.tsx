import { TrophyTile } from "@/components/TrophyIcon";
import { relativeDate } from "@/lib/design";
import type { Trophy } from "@/lib/types";

/**
 * Vista alternativa a `TrophyList`: los trofeos ya conseguidos de ESTE
 * juego, en el orden real en que cayeron — la "historia" de la partida en
 * vez de la lista completa agrupada por metal. Solo cuenta lo que tiene
 * `earnedAt` real (PSN/Steam lo dan siempre que el trofeo esté ganado); sin
 * eso no hay orden que contar, así que esos quedan fuera en vez de salir
 * todos amontonados al principio o al final sin fecha real detrás.
 */
export function TrophyTimeline({ trophies }: { trophies: Trophy[] }) {
  const conseguidos = trophies
    .filter((t) => t.earned && t.earnedAt)
    .sort((a, b) => new Date(a.earnedAt!).getTime() - new Date(b.earnedAt!).getTime());

  if (conseguidos.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        Aún no hay ningún trofeo con fecha registrada aquí.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {conseguidos.map((trophy, index) => (
        <div key={trophy.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <TrophyTile grade={trophy.grade} size={32} />
            {index < conseguidos.length - 1 && (
              <div className="my-1 w-px flex-1" style={{ background: "var(--border)", minHeight: "12px" }} />
            )}
          </div>
          <div className="pb-6">
            <p className="text-[0.8125rem] font-bold">{trophy.name}</p>
            {trophy.detail && <p className="mt-0.5 text-xs text-muted">{trophy.detail}</p>}
            <p className="mt-1 text-[0.6875rem] text-muted">
              {relativeDate(trophy.earnedAt) ?? new Date(trophy.earnedAt!).toLocaleDateString("es-ES")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
