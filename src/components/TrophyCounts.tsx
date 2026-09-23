import { useTranslations } from "next-intl";
import { GRADES, type TrophyCounts as Counts } from "@/lib/types";
import { TrophyIcon } from "./TrophyIcon";

/**
 * Recuento por tipo de trofeo, en la barra con divisores de la maqueta.
 *
 * Cada cifra lleva icono y etiqueta accesible, nunca solo el color: plata y
 * platino son casi grises a propósito (es el color del material), así que el
 * color por sí solo no distinguiría uno de otro.
 */
export function TrophyCountRow({
  counts,
  summary,
  tieneMetales = true,
  logrosSinMetal = 0,
}: {
  counts: Counts;
  summary?: string;
  /** Falso cuando la biblioteca no tiene ningún juego con oro/plata/bronce de verdad (solo Steam/Xbox) — oculta esas tres columnas en vez de enseñarlas siempre a cero. */
  tieneMetales?: boolean;
  /** Logros de plataformas sin metal (Steam, Xbox) — ver `logrosSinMetal` en `summarise()` (lib/stats.ts). */
  logrosSinMetal?: number;
}) {
  const t = useTranslations("Biblioteca");
  const grades = tieneMetales ? GRADES : GRADES.filter((g) => g === "platinum");
  // El "de dónde sale esto" de cada cifra, como tooltip nativo (title): el
  // platino mezcla metal real (PSN/Epic) con el 100% de Steam/Xbox, así que
  // sin esto no hay forma de saber por qué un platino de Steam cuenta igual
  // que uno "de verdad".
  const tooltipDeGrado = (grade: (typeof GRADES)[number]) =>
    grade === "platinum" ? t("TrophyCountRow.tooltipPlatino") : t("TrophyCountRow.tooltipMetales");

  return (
    <div
      className="flex items-center gap-2.5 rounded-2xl px-5 py-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,255,255,0.08)]"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <ul className="flex flex-1 flex-wrap items-center">
        {grades.map((grade, i) => (
          <li
            key={grade}
            className="flex items-center gap-2.5 pr-[22px]"
            title={tooltipDeGrado(grade)}
            style={i < grades.length - 1 || logrosSinMetal > 0 ? { marginRight: 12, borderRight: "1px solid var(--border)" } : undefined}
          >
            <TrophyIcon grade={grade} size={20} />
            <span className="font-heading text-lg font-bold tabular-nums">{counts[grade]}</span>
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
              {t(`TrophyIcon.grade.${grade}`)}
            </span>
          </li>
        ))}
        {logrosSinMetal > 0 && (
          <li className="flex items-center gap-2.5 pr-[22px]" title={t("TrophyCountRow.tooltipLogros")}>
            <TrophyIcon size={20} />
            <span className="font-heading text-lg font-bold tabular-nums">{logrosSinMetal}</span>
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
              {t("TrophyCountRow.logros")}
            </span>
          </li>
        )}
      </ul>
      {summary && <span className="shrink-0 text-xs text-muted">{summary}</span>}
    </div>
  );
}
