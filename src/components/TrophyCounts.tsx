import { GRADES, type TrophyCounts as Counts } from "@/lib/types";
import { GRADE_LABEL, TrophyIcon } from "./TrophyIcon";

/**
 * Recuento por tipo de trofeo, en la barra con divisores de la maqueta.
 *
 * Cada cifra lleva icono y etiqueta accesible, nunca solo el color: plata y
 * platino son casi grises a propósito (es el color del material), así que el
 * color por sí solo no distinguiría uno de otro.
 */
export function TrophyCountRow({ counts, summary }: { counts: Counts; summary?: string }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-2xl px-5 py-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,255,255,0.08)]"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <ul className="flex flex-1 flex-wrap items-center">
        {GRADES.map((grade, i) => (
          <li
            key={grade}
            className="flex items-center gap-2.5 pr-[22px]"
            style={i < GRADES.length - 1 ? { marginRight: 12, borderRight: "1px solid var(--border)" } : undefined}
          >
            <TrophyIcon grade={grade} size={20} />
            <span className="font-heading text-lg font-bold tabular-nums">{counts[grade]}</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              {GRADE_LABEL[grade]}
            </span>
          </li>
        ))}
      </ul>
      {summary && <span className="shrink-0 text-xs text-muted">{summary}</span>}
    </div>
  );
}
