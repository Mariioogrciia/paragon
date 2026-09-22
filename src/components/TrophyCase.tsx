import type { TrophyCaseAward } from "@/lib/trophyCase";
import { TrophyTile } from "@/components/TrophyIcon";

/**
 * Palmarés del perfil: solo el ganador ABSOLUTO de la Liga Mensual o de
 * una Liga privada — nunca Top 3, a propósito (ver el comentario de
 * `cerrarLigaMensualSiToca` en lib/trophyCase.ts): si casi cualquiera
 * termina con alguna copa, el palmarés deja de significar nada.
 *
 * Reutiliza `TrophyTile` (grado platino) en vez de un emoji de medalla —
 * mismo lenguaje visual que ya usa el resto de la app para "esto es lo más
 * alto que hay", no un icono importado de fuera.
 */
export function TrophyCase({ items }: { items: TrophyCaseAward[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((award, i) => (
        <span
          key={`${award.kind}-${award.titulo}-${i}`}
          title={new Date(award.earnedAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
          className="inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-bold"
          style={{ background: "rgba(159, 212, 236, 0.1)", border: "1px solid rgba(159, 212, 236, 0.35)", color: "var(--platinum)" }}
        >
          <TrophyTile grade="platinum" size={22} />
          {award.titulo}
        </span>
      ))}
    </div>
  );
}
