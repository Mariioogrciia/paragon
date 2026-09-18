"use client";

import { useState } from "react";
import { colorFor } from "@/lib/design";
import { GRADES, type Trophy, type TrophyGrade } from "@/lib/types";

const GRADE_LABEL: Record<TrophyGrade, string> = { platinum: "Platino", gold: "Oro", silver: "Plata", bronze: "Bronce" };

/** Ancho mínimo por día en el eje X — por debajo de esto el abanico de un
 * día con varios trofeos (28px entre cada uno) empieza a invadir al día de
 * al lado. Con pocos días el gráfico igual se estira para llenar el ancho
 * disponible (min-width: 100%, ver más abajo); con muchos, el gráfico
 * crece hacia la derecha y aparece scroll horizontal en vez de comprimir
 * cada hueco por debajo de este mínimo. */
const MIN_DAY_WIDTH_PX = 56;

function formatFecha(millis: number): string {
  return new Date(millis).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Vista alternativa a la lista de trofeos: cuándo cayó cada uno (eje X) y lo
 * raro que es (eje Y, el % real de jugadores que lo tiene — 0% arriba del
 * todo, más raro, hasta 100% abajo) — con la foto real del trofeo, no un
 * icono genérico por metal. Solo cuenta lo que tiene `earnedAt` Y
 * `rarityPercent` reales; sin los dos no hay ni fecha ni altura que
 * dibujar, así que esos se quedan fuera en vez de amontonarse en un borde
 * sin significar nada.
 */
export function TrophyTimeline({ trophies }: { trophies: Trophy[] }) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const puntos = trophies
    .filter((t): t is Trophy & { earnedAt: string; rarityPercent: number } => t.earned && !!t.earnedAt && t.rarityPercent != null)
    .map((t) => ({ ...t, fechaMillis: new Date(t.earnedAt).getTime() }))
    .sort((a, b) => a.fechaMillis - b.fechaMillis);

  if (puntos.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        Hacen falta al menos dos trofeos con fecha y rareza registradas para dibujar la gráfica.
      </p>
    );
  }

  // El eje X NO es proporcional al tiempo transcurrido a propósito: un
  // juego jugado a rachas (varios trofeos en pocos días, luego meses o
  // años sin tocarlo) con una escala lineal real deja los huecos vacíos
  // "robando" casi todo el ancho y la ráfaga entera aplastada en un
  // puñado de píxeles. En su lugar, cada DÍA con trofeos se lleva un
  // hueco igual en el eje, en orden cronológico — la fecha real de cada
  // uno se sigue viendo al pasar el ratón, solo cambia que un hueco de un
  // día y uno de tres años ocupan el mismo ancho visual.
  const porDia = new Map<string, typeof puntos>();
  for (const p of puntos) {
    const dia = new Date(p.fechaMillis).toISOString().slice(0, 10);
    const grupo = porDia.get(dia);
    if (grupo) grupo.push(p);
    else porDia.set(dia, [p]);
  }
  const diasOrdenados = [...porDia.keys()];
  const xPorDia = new Map(
    diasOrdenados.map((dia, i) => [dia, diasOrdenados.length === 1 ? 50 : (i / (diasOrdenados.length - 1)) * 100]),
  );
  const diaDe = (p: (typeof puntos)[number]) => new Date(p.fechaMillis).toISOString().slice(0, 10);
  const xFor = (p: (typeof puntos)[number]) => xPorDia.get(diaDe(p)) ?? 0;

  // Dentro de un mismo día, varios trofeos siguen cayendo en la misma X —
  // se abren en abanico horizontal (offsetPx, no cambia la fecha que se
  // muestra), ordenados por hora exacta dentro del día.
  const MARKER_SPACING_PX = 28;
  const offsetPorId = new Map<string, number>();
  for (const grupo of porDia.values()) {
    grupo.forEach((p, i) => {
      offsetPorId.set(p.id, (i - (grupo.length - 1) / 2) * MARKER_SPACING_PX);
    });
  }

  // Una etiqueta por cada mes nuevo que aparece, en el día donde empieza —
  // sin esto, al dejar de ser el eje proporcional al tiempo, no hay forma
  // de saber cuánto tiempo real representa desplazarse por el gráfico.
  const etiquetasMes: { xPct: number; texto: string }[] = [];
  let mesAnterior = "";
  diasOrdenados.forEach((dia, i) => {
    const mesKey = dia.slice(0, 7);
    if (mesKey === mesAnterior) return;
    mesAnterior = mesKey;
    etiquetasMes.push({
      xPct: xPorDia.get(dia) ?? 0,
      texto: new Date(`${dia}T00:00:00Z`).toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
    });
  });

  const gradosPresentes = GRADES.filter((g) => puntos.some((p) => p.grade === g));
  const anchoContenido = Math.max(diasOrdenados.length * MIN_DAY_WIDTH_PX, MIN_DAY_WIDTH_PX);

  return (
    <div>
      {gradosPresentes.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {gradosPresentes.map((g) => (
            <div key={g} className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(g) }} />
              {GRADE_LABEL[g]}
            </div>
          ))}
        </div>
      )}

      <div className="flex" style={{ height: 320 }}>
        {/* Eje Y: fuera del contenedor con scroll, se queda fijo a la
            izquierda mientras se desplaza el gráfico en horizontal. Su
            altura (300, no 320) deja el mismo hueco de 20px de abajo que
            ocupan las etiquetas de mes al otro lado, para que el 0%/100%
            sigan alineados con las líneas de cuadrícula reales. */}
        <div className="flex shrink-0 flex-col justify-between pr-2 text-right text-[0.625rem] text-muted" style={{ width: 34, height: 300 }}>
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>

        <div className="flex-1 overflow-x-auto">
          {/* min-width: 100% deja que se estire para llenar el hueco
              disponible con pocos días; width explícito fuerza el mínimo
              por día cuando hay muchos, apareciendo el scroll. Las
              etiquetas de mes van en su propia fila DEBAJO del área de
              puntos (no encima, se solaparían con los trofeos de rareza
              alta que caen cerca del 100% = abajo del todo) pero dentro
              del mismo ancho, para que se desplacen a la vez.*/}
          <div style={{ width: anchoContenido, minWidth: "100%" }}>
            <div className="relative h-full border-l" style={{ borderColor: "var(--border)", height: 300 }}>
              {[0, 25, 50, 75, 100].map((r) => (
                <div
                  key={r}
                  className="absolute left-0 right-0 h-px"
                  style={{ top: `${r}%`, background: "var(--border)", opacity: 0.4 }}
                />
              ))}

              {puntos.map((p) => (
              <div
                key={p.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `calc(${xFor(p)}% + ${offsetPorId.get(p.id) ?? 0}px)`,
                  top: `${p.rarityPercent}%`,
                  zIndex: hoverId === p.id ? 20 : 1,
                }}
                onMouseEnter={() => setHoverId(p.id)}
                onMouseLeave={() => setHoverId((id) => (id === p.id ? null : id))}
              >
                <div
                  className="h-8 w-8 cursor-pointer overflow-hidden rounded-full border-2 bg-surface-2 transition-transform"
                  style={{
                    borderColor: colorFor(p.grade),
                    transform: hoverId === p.id ? "scale(1.4)" : undefined,
                  }}
                >
                  {p.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.iconUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-[0.5625rem] font-bold"
                      style={{ background: colorFor(p.grade), color: "var(--background)" }}
                    >
                      {p.grade ? GRADE_LABEL[p.grade][0] : "?"}
                    </div>
                  )}
                </div>

                {hoverId === p.id && (
                  <div
                    className="absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 rounded-lg p-2.5 text-center shadow-lg"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <p className="text-xs font-bold">{p.name}</p>
                    <p className="mt-0.5 text-[0.6875rem] text-muted">
                      {formatFecha(p.fechaMillis)} · {p.rarityPercent.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
              ))}
            </div>

            <div className="relative" style={{ height: 20 }}>
              {etiquetasMes.map((e, i) => (
                <span
                  key={i}
                  className="absolute top-1 text-[0.5625rem] text-muted"
                  style={{ left: `${e.xPct}%`, transform: "translateX(-50%)" }}
                >
                  {e.texto}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
