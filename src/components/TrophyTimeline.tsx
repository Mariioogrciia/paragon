"use client";

import { useEffect, useRef, useState } from "react";
import { colorFor } from "@/lib/design";
import { GRADES, type Trophy, type TrophyGrade } from "@/lib/types";

const GRADE_LABEL: Record<TrophyGrade, string> = { platinum: "Platino", gold: "Oro", silver: "Plata", bronze: "Bronce" };

/** Ancho mínimo por día en el eje X, solo en modo Detalle — por debajo de
 * esto el abanico de un día con varios trofeos (28px entre cada uno)
 * empieza a invadir al día de al lado. Con pocos días el gráfico igual se
 * estira para llenar el ancho disponible (min-width: 100%, ver más abajo);
 * con muchos, el gráfico crece hacia la derecha y aparece scroll horizontal
 * en vez de comprimir cada hueco por debajo de este mínimo. El modo
 * Resumen (por defecto) no usa esto — reparte todos los días en el ancho
 * real disponible, sin scroll, a costa de agrupar cada día en una sola
 * burbuja en vez de un trofeo por marcador. */
const MIN_DAY_WIDTH_PX = 56;

/** Alto del área de puntos (sin la fila de meses de abajo). */
const PLOT_HEIGHT_PX = 300;

/** Alto de la fila de meses. El contenedor exterior tiene que reservar
 * PLOT_HEIGHT_PX + esto — si no, el div con overflow-x-auto (que por la
 * propia spec de CSS deja de tener overflow-y "visible" en cuanto
 * overflow-x no lo es) recorta la fila de meses entera por quedar fuera de
 * su propia caja, aunque sea su hijo. Solo aplica en modo Detalle; Resumen
 * no tiene overflow-x-auto y por tanto no tiene este problema. */
const MONTH_LABEL_HEIGHT_PX = 20;

/** Radio del marcador (h-8 w-8 = 32px) — el hueco que hay que dejar en los
 * cuatro bordes en modo Detalle para que un trofeo con 0% o 100% de rareza
 * exacto no quede con medio círculo fuera del área dibujable (ahí sí hay
 * overflow-x-auto, que fuerza a overflow-y a dejar de ser "visible"). En
 * modo Resumen no hace falta: no hay contenedor con scroll, así que nada
 * se recorta aunque un marcador quede justo en el borde. */
const MARKER_PADDING_PX = 16;

type ViewMode = "resumen" | "detalle";

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
 *
 * Dos modos:
 * - **Resumen** (por defecto): un marcador por DÍA, repartidos en el ancho
 *   real disponible — nunca hay scroll. Un día con varios trofeos se ve
 *   como una burbuja con el número dentro (tamaño según cantidad); un día
 *   con uno solo sigue mostrando su foto real, igual que antes.
 * - **Detalle**: la gráfica de siempre, con ancho mínimo por día y scroll
 *   horizontal si hace falta, cada trofeo con su propia foto y en abanico
 *   si comparte día con otros. Se abre tocando cualquier burbuja del
 *   Resumen (centra el día tocado), o con el interruptor de arriba.
 */
export function TrophyTimeline({ trophies }: { trophies: Trophy[] }) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("resumen");
  const [focusDia, setFocusDia] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const fracPorDia = new Map(
    diasOrdenados.map((dia, i) => [dia, diasOrdenados.length === 1 ? 0.5 : i / (diasOrdenados.length - 1)]),
  );
  const diaDe = (p: (typeof puntos)[number]) => new Date(p.fechaMillis).toISOString().slice(0, 10);

  // Dentro de un mismo día, varios trofeos siguen cayendo en la misma X —
  // se abren en abanico horizontal (offsetPx, no cambia la fecha que se
  // muestra), ordenados por hora exacta dentro del día. Solo se usa en
  // modo Detalle; Resumen colapsa el día entero en una burbuja.
  const MARKER_SPACING_PX = 28;
  const offsetPorId = new Map<string, number>();
  for (const grupo of porDia.values()) {
    grupo.forEach((p, i) => {
      offsetPorId.set(p.id, (i - (grupo.length - 1) / 2) * MARKER_SPACING_PX);
    });
  }

  // Una etiqueta por cada mes nuevo que aparece, en el día donde empieza.
  const etiquetasMes: { frac: number; texto: string }[] = [];
  let mesAnterior = "";
  diasOrdenados.forEach((dia) => {
    const mesKey = dia.slice(0, 7);
    if (mesKey === mesAnterior) return;
    mesAnterior = mesKey;
    etiquetasMes.push({
      frac: fracPorDia.get(dia) ?? 0,
      texto: new Date(`${dia}T00:00:00Z`).toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
    });
  });

  // Agregados por día para el modo Resumen: cuántos trofeos cayeron, su
  // rareza media (posición Y de la burbuja) y el metal más alto presente
  // (color del anillo — GRADES ya viene ordenado platino>oro>plata>bronce).
  const resumenPorDia = diasOrdenados.map((dia) => {
    const grupo = porDia.get(dia)!;
    const rarezaMedia = grupo.reduce((sum, p) => sum + p.rarityPercent, 0) / grupo.length;
    const gradoDominante = GRADES.find((g) => grupo.some((p) => p.grade === g)) ?? grupo[0].grade;
    return { dia, grupo, rarezaMedia, gradoDominante, frac: fracPorDia.get(dia) ?? 0 };
  });

  const gradosPresentes = GRADES.filter((g) => puntos.some((p) => p.grade === g));
  const anchoDetalle = Math.max(diasOrdenados.length * MIN_DAY_WIDTH_PX, MIN_DAY_WIDTH_PX);

  // Posición en PÍXELES dentro del ancho de Detalle, con margen a los
  // cuatro lados igual al radio del marcador — ver MARKER_PADDING_PX.
  const xPxDetalle = (frac: number) => MARKER_PADDING_PX + frac * (anchoDetalle - 2 * MARKER_PADDING_PX);
  const yPx = (rarity: number) => MARKER_PADDING_PX + (rarity / 100) * (PLOT_HEIGHT_PX - 2 * MARKER_PADDING_PX);

  // Al entrar en Detalle desde una burbuja concreta, centra ese día en el
  // scroll — si no, el día tocado en un juego con muchos días puede caer
  // fuera de la ventana visible y parece que "no ha pasado nada".
  useEffect(() => {
    if (mode !== "detalle" || focusDia == null) return;
    const el = scrollRef.current;
    if (!el) return;
    const frac = fracPorDia.get(focusDia) ?? 0;
    const targetLeft = xPxDetalle(frac) - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, targetLeft);
  }, [mode, focusDia]); // eslint-disable-line react-hooks/exhaustive-deps

  const abrirDetalleEn = (dia: string) => {
    setFocusDia(dia);
    setMode("detalle");
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {gradosPresentes.length > 1 ? (
          <div className="flex flex-wrap gap-3">
            {gradosPresentes.map((g) => (
              <div key={g} className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(g) }} />
                {GRADE_LABEL[g]}
              </div>
            ))}
          </div>
        ) : (
          <div />
        )}

        <div className="flex rounded-lg border p-0.5 text-[0.6875rem] font-semibold" style={{ borderColor: "var(--border)" }}>
          {([
            ["resumen", "Resumen"],
            ["detalle", "Detalle"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className="rounded-[7px] px-2.5 py-1 transition-colors"
              style={
                mode === value
                  ? { background: "var(--accent)", color: "var(--background)" }
                  : { color: "var(--muted)" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "resumen" ? (
        // Sin overflow-x-auto y sin ancho mínimo por día: todos los días
        // se reparten en el ancho real del contenedor, así que nunca hay
        // scroll ni horizontal ni vertical — el precio es que un día con
        // varios trofeos se ve como una burbuja con un número, no como
        // cada foto por separado (eso es lo que ofrece Detalle).
        <div className="flex" style={{ height: PLOT_HEIGHT_PX }}>
          <EjeY />
          <div className="relative min-w-0 flex-1 border-l" style={{ borderColor: "var(--border)", height: PLOT_HEIGHT_PX }}>
            {[0, 25, 50, 75, 100].map((r) => (
              <div
                key={r}
                className="absolute left-0 right-0 h-px"
                style={{ top: yPx(r), background: "var(--border)", opacity: 0.4 }}
              />
            ))}

            {resumenPorDia.map(({ dia, grupo, rarezaMedia, gradoDominante, frac }) => {
              const size = grupo.length === 1 ? 32 : Math.min(24 + grupo.length * 3, 44);
              const single = grupo.length === 1 ? grupo[0] : null;
              const isHover = hoverId === dia;
              return (
                <div
                  key={dia}
                  className="absolute -translate-y-1/2 cursor-pointer"
                  style={{
                    left: `${frac * 100}%`,
                    top: yPx(rarezaMedia),
                    transform: `translate(-50%, -50%) scale(${isHover ? 1.15 : 1})`,
                    zIndex: isHover ? 20 : 1,
                    transition: "transform 120ms ease",
                  }}
                  onMouseEnter={() => setHoverId(dia)}
                  onMouseLeave={() => setHoverId((id) => (id === dia ? null : id))}
                  onClick={() => abrirDetalleEn(dia)}
                >
                  <div
                    className="flex items-center justify-center overflow-hidden rounded-full border-2 bg-surface-2 font-bold"
                    style={{
                      width: size,
                      height: size,
                      borderColor: colorFor(gradoDominante),
                      fontSize: size < 32 ? "0.6875rem" : undefined,
                      color: "var(--foreground)",
                    }}
                  >
                    {single ? (
                      single.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={single.iconUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span style={{ color: colorFor(single.grade) }}>{single.grade ? GRADE_LABEL[single.grade][0] : "?"}</span>
                      )
                    ) : (
                      grupo.length
                    )}
                  </div>

                  {isHover && (
                    <div
                      className="absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 rounded-lg p-2.5 text-center shadow-lg"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    >
                      <p className="text-xs font-bold">
                        {single ? single.name : `${grupo.length} trofeos ese día`}
                      </p>
                      <p className="mt-0.5 text-[0.6875rem] text-muted">
                        {formatFecha(grupo[0].fechaMillis)} · {rarezaMedia.toFixed(1)}% {single ? "" : "de media"}
                      </p>
                      <p className="mt-1 text-[0.625rem] font-semibold" style={{ color: "var(--accent)" }}>
                        Tocar para ver{single ? "" : " cada uno"} en detalle
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex" style={{ height: PLOT_HEIGHT_PX + MONTH_LABEL_HEIGHT_PX }}>
          {/* Eje Y: fuera del contenedor con scroll, se queda fijo a la
              izquierda mientras se desplaza el gráfico en horizontal. */}
          <EjeY />

          <div ref={scrollRef} className="flex-1 overflow-x-auto">
            {/* min-width: 100% deja que se estire para llenar el hueco
                disponible con pocos días; width explícito fuerza el mínimo
                por día cuando hay muchos, apareciendo el scroll. Las
                etiquetas de mes van en su propia fila DEBAJO del área de
                puntos (no encima, se solaparían con los trofeos de rareza
                alta que caen cerca del 100% = abajo del todo) pero dentro
                del mismo ancho, para que se desplacen a la vez. */}
            <div style={{ width: anchoDetalle, minWidth: "100%" }}>
              <div className="relative border-l" style={{ borderColor: "var(--border)", height: PLOT_HEIGHT_PX }}>
                {[0, 25, 50, 75, 100].map((r) => (
                  <div
                    key={r}
                    className="absolute left-0 right-0 h-px"
                    style={{ top: yPx(r), background: "var(--border)", opacity: 0.4 }}
                  />
                ))}

                {puntos.map((p) => (
                  <div
                    key={p.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: xPxDetalle(fracPorDia.get(diaDe(p)) ?? 0) + (offsetPorId.get(p.id) ?? 0),
                      top: yPx(p.rarityPercent),
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

              <div className="relative" style={{ height: MONTH_LABEL_HEIGHT_PX }}>
                {etiquetasMes.map((e, i) => (
                  <span
                    key={i}
                    className="absolute top-1 text-[0.5625rem] text-muted"
                    style={{ left: xPxDetalle(e.frac), transform: "translateX(-50%)" }}
                  >
                    {e.texto}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Columna de "0%"..."100%" del eje Y — idéntica en Resumen y Detalle, fuera
 * del contenedor con scroll (si lo hay) para quedarse fija a la izquierda. */
function EjeY() {
  return (
    <div
      className="flex shrink-0 flex-col justify-between pr-2 text-right text-[0.625rem] text-muted"
      style={{ width: 34, height: PLOT_HEIGHT_PX, paddingTop: MARKER_PADDING_PX, paddingBottom: MARKER_PADDING_PX }}
    >
      <span>0%</span>
      <span>25%</span>
      <span>50%</span>
      <span>75%</span>
      <span>100%</span>
    </div>
  );
}
