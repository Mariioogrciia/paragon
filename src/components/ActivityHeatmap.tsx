import { useLocale, useTranslations } from "next-intl";
import type { DiaActividad } from "@/lib/profileStats";
import { TooltipDelegado } from "@/components/TooltipDelegado";

/**
 * Mapa de actividad estilo GitHub — un cuadrito por día, más intenso cuanto
 * más trofeos se ganaron ese día. Sale de `earnedAt` (ver el comentario de
 * `lib/profileStats.ts`): es "días con trofeos ganados", el proxy más
 * honesto que hay de "días jugados" — ni PSN ni Steam dan un registro de
 * sesiones real.
 *
 * Semanas de lunes a domingo (convención española, no la de GitHub que
 * empieza en domingo). El detalle de cada día es un tooltip propio
 * (TooltipDelegado) — el `title` nativo del navegador tarda en aparecer y
 * es minúsculo, así que no se notaba que hubiera nada al pasar el ratón.
 */
function nivel(trofeos: number): number {
  if (trofeos === 0) return 0;
  if (trofeos <= 2) return 1;
  if (trofeos <= 5) return 2;
  if (trofeos <= 9) return 3;
  return 4;
}

const OPACIDAD_POR_NIVEL = [0, 0.25, 0.45, 0.7, 1];
// Versión protagonista: la intensidad sube por metales, como los trofeos.
const METAL_POR_NIVEL = ["", "#c07b4a", "#b9c2cc", "#e2b53e", "#9fd4ec"];

function fechaLarga(iso: string, locale: string): string {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia)).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function ActivityHeatmap({ dias, grande = false }: { dias: DiaActividad[]; grande?: boolean }) {
  const t = useTranslations("Analitica.activityHeatmap");
  const locale = useLocale();
  const DIAS_SEMANA = t.raw("diasSemanaIniciales") as string[];
  const MESES = t.raw("mesesCortos") as string[];

  if (dias.length === 0) return null;

  // Relleno de días vacíos al principio para que la primera semana empiece en lunes.
  const primerDia = new Date(`${dias[0].dia}T00:00:00Z`);
  const huecoInicial = (primerDia.getUTCDay() + 6) % 7; // lunes=0 ... domingo=6
  const celdas: (DiaActividad | null)[] = [...Array(huecoInicial).fill(null), ...dias];

  const semanas: (DiaActividad | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));

  const total = dias.reduce((acc, d) => acc + d.trofeos, 0);

  // Una etiqueta de mes por columna, solo cuando ese mes empieza en esa semana.
  const etiquetasMes: { semana: number; texto: string }[] = [];
  let mesAnterior = -1;
  semanas.forEach((semana, i) => {
    const primerDiaReal = semana.find((d) => d !== null);
    if (!primerDiaReal) return;
    const mes = Number(primerDiaReal.dia.slice(5, 7)) - 1;
    if (mes !== mesAnterior) {
      etiquetasMes.push({ semana: i, texto: MESES[mes] });
      mesAnterior = mes;
    }
  });

  return (
    // Mismo motivo que en HourlyHeatmap.tsx: `overflow-x-auto` sin más
    // también recorta en vertical, y el tooltip de cada día (que sale hacia
    // arriba) se veía cortado por el borde de la tarjeta.
    <div className="overflow-x-auto pt-8 -mt-8">
      {grande ? (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-[clamp(1.5rem,4vw,2.25rem)] font-bold uppercase leading-tight">{t("titulo")}</h2>
          <p className="carreras-cifra text-lg text-[var(--accent-text)]">{t("totalTrofeos", { count: total })}</p>
        </div>
      ) : (
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-semibold">{t("totalTrofeos", { count: total })}</p>
        </div>
      )}
      <div className={grande ? "flex min-w-[640px] gap-2" : "inline-flex gap-2"}>
        <div className={`flex flex-col pt-4 text-[0.625rem] font-semibold text-muted ${grande ? "" : "gap-[3px]"}`}>
          {DIAS_SEMANA.map((d, i) => (
            <span key={i} className={grande ? "flex flex-1 items-center" : "flex h-[11px] items-center"}>{d}</span>
          ))}
        </div>
        <div className={grande ? "min-w-0 flex-1" : undefined}>
          <div className="relative mb-1 h-3" style={grande ? undefined : { width: semanas.length * 14 }}>
            {etiquetasMes.map((m) => (
              <span key={m.semana} className="absolute text-[0.625rem] font-semibold text-muted" style={{ left: grande ? `${(m.semana / semanas.length) * 100}%` : m.semana * 14 }}>
                {m.texto}
              </span>
            ))}
          </div>
          {/* Un solo SVG con un <rect> por día y UN tooltip compartido
              (TooltipDelegado): antes eran dos <div> por día más su tooltip
              oculto, ~300 KB de HTML en la página de estadísticas. */}
          <TooltipDelegado>
            <svg
              {...(grande
                ? { viewBox: `0 0 ${semanas.length * 14 - 3} ${7 * 14 - 3}`, width: "100%" }
                : { width: semanas.length * 14 - 3, height: 7 * 14 - 3 })}
              className="block"
              role="img"
              aria-label={t("totalTrofeos", { count: total })}
            >
              <style>{`.hm{rx:2px;fill:var(--surface-2)}.hm:hover{stroke:var(--foreground);stroke-width:1px}${(grande ? METAL_POR_NIVEL : OPACIDAD_POR_NIVEL)
                .slice(1)
                .map((v, n) => `.hm${n + 1}{fill:${grande ? v : `rgb(var(--accent-rgb) / ${v})`}}`)
                .join("")}`}</style>
              {semanas.map((semana, i) =>
                semana.map((d, j) =>
                  d ? (
                    <rect
                      key={`${i}-${j}`}
                      x={i * 14}
                      y={j * 14}
                      width={11}
                      height={11}
                      className={nivel(d.trofeos) === 0 ? "hm" : `hm hm${nivel(d.trofeos)}`}
                      data-t={t("tooltip", { count: d.trofeos, fecha: fechaLarga(d.dia, locale) })}
                    />
                  ) : null,
                ),
              )}
            </svg>
          </TooltipDelegado>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[0.625rem] text-muted">
        <span>{t("menos")}</span>
        {OPACIDAD_POR_NIVEL.map((op, i) => (
          <div
            key={i}
            className="h-[11px] w-[11px] rounded-[2px]"
            style={{ background: op === 0 ? "var(--surface-2)" : grande ? METAL_POR_NIVEL[i] : `rgb(var(--accent-rgb) / ${op})` }}
          />
        ))}
        <span>{t("mas")}</span>
      </div>
    </div>
  );
}
