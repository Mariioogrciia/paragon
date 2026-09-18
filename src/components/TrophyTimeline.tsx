"use client";

import { useState } from "react";
import { colorFor } from "@/lib/design";
import { GRADES, type Trophy, type TrophyGrade } from "@/lib/types";

const GRADE_LABEL: Record<TrophyGrade, string> = { platinum: "Platino", gold: "Oro", silver: "Plata", bronze: "Bronce" };

/** Alto del área de puntos (sin la fila de meses de abajo). */
const PLOT_HEIGHT_PX = 300;

/** Alto de la fila de meses. */
const MONTH_LABEL_HEIGHT_PX = 20;

/** Margen a los cuatro lados del área de puntos — sin esto, un trofeo con
 * 0%/100% de rareza exacto, o del primer/último día, queda con el centro
 * justo en el borde. */
const MARKER_PADDING_PX = 16;

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
 * Un marcador por DÍA (no por trofeo), repartido en el ancho real
 * disponible — nunca hay scroll, ni horizontal ni vertical. El eje X usa
 * raíz cuadrada del tiempo transcurrido desde el primer trofeo (no el
 * índice del día ni el tiempo lineal): así SÍ se aprecia qué días están
 * cerca y cuáles lejos en el tiempo real (antes cada día se llevaba un
 * hueco idéntico, sin ninguna información de distancia), pero una racha de
 * días seguidos después de meses de silencio no se aplasta del todo como
 * pasaría con una escala lineal pura. Un día con varios trofeos se ve como
 * una burbuja con el número dentro — tocarla abre un popup con la lista
 * (nombre, foto real, fecha, rareza), en vez de una gráfica con scroll. Un
 * día con un solo trofeo muestra directamente su foto real; tocarlo o
 * pasar el ratón por encima da el mismo detalle en una tarjeta pequeña.
 */
export function TrophyTimeline({ trophies }: { trophies: Trophy[] }) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [popupDia, setPopupDia] = useState<string | null>(null);

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

  const porDia = new Map<string, typeof puntos>();
  for (const p of puntos) {
    const dia = new Date(p.fechaMillis).toISOString().slice(0, 10);
    const grupo = porDia.get(dia);
    if (grupo) grupo.push(p);
    else porDia.set(dia, [p]);
  }
  const diasOrdenados = [...porDia.keys()];

  // Raíz cuadrada de los días transcurridos desde el primero, normalizada a
  // [0, 1] — comprime lo bastante una racha larga sin tiempo real detrás
  // (queda toda apretada a la izquierda) para que quepa igual, pero deja
  // ver de un vistazo que dos días seguidos están más cerca que dos separados
  // por meses, algo que una posición por índice (antigua) no podía enseñar.
  const primerDiaMillis = new Date(`${diasOrdenados[0]}T00:00:00Z`).getTime();
  const ultimoDiaMillis = new Date(`${diasOrdenados[diasOrdenados.length - 1]}T00:00:00Z`).getTime();
  const rangoTotalDias = Math.max(1, (ultimoDiaMillis - primerDiaMillis) / 86400000);
  const raizRangoTotal = Math.sqrt(rangoTotalDias);
  const fracPorDia = new Map(
    diasOrdenados.map((dia) => {
      if (diasOrdenados.length === 1) return [dia, 0.5];
      const diasDesdeElPrimero = (new Date(`${dia}T00:00:00Z`).getTime() - primerDiaMillis) / 86400000;
      return [dia, Math.sqrt(diasDesdeElPrimero) / raizRangoTotal];
    }),
  );

  // Una etiqueta por cada mes nuevo que aparece, en el día donde empieza —
  // salvo que caiga demasiado cerca de la anterior ya puesta: con la
  // escala de raíz cuadrada, varios meses pueden apretarse en muy poco
  // espacio (un tramo con un trofeo suelto cada mes, por ejemplo) y las
  // etiquetas se solapan unas con otras, ilegibles. GAP_MIN_ETIQUETA_FRAC
  // es la separación mínima entre dos etiquetas, en fracción del ancho
  // total — a este tamaño de letra, menos que esto ya se pisan.
  const GAP_MIN_ETIQUETA_FRAC = 0.06;
  const etiquetasMes: { frac: number; texto: string }[] = [];
  let mesAnterior = "";
  let fracUltimaEtiqueta = -Infinity;
  diasOrdenados.forEach((dia) => {
    const mesKey = dia.slice(0, 7);
    if (mesKey === mesAnterior) return;
    const frac = fracPorDia.get(dia) ?? 0;
    if (frac - fracUltimaEtiqueta < GAP_MIN_ETIQUETA_FRAC) return;
    mesAnterior = mesKey;
    fracUltimaEtiqueta = frac;
    etiquetasMes.push({
      frac,
      texto: new Date(`${dia}T00:00:00Z`).toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
    });
  });

  // Agregados por día: cuántos trofeos cayeron, su rareza media (posición Y
  // de la burbuja) y el metal más alto presente (color del anillo — GRADES
  // ya viene ordenado platino>oro>plata>bronce).
  const resumenPorDia = diasOrdenados.map((dia) => {
    const grupo = porDia.get(dia)!;
    const rarezaMedia = grupo.reduce((sum, p) => sum + p.rarityPercent, 0) / grupo.length;
    const gradoDominante = GRADES.find((g) => grupo.some((p) => p.grade === g)) ?? grupo[0].grade;
    return { dia, grupo, rarezaMedia, gradoDominante, frac: fracPorDia.get(dia) ?? 0 };
  });

  const gradosPresentes = GRADES.filter((g) => puntos.some((p) => p.grade === g));
  const yPx = (rarity: number) => MARKER_PADDING_PX + (rarity / 100) * (PLOT_HEIGHT_PX - 2 * MARKER_PADDING_PX);

  const grupoPopup = popupDia ? porDia.get(popupDia) : null;

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

      <div className="flex" style={{ height: PLOT_HEIGHT_PX + MONTH_LABEL_HEIGHT_PX }}>
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
                onClick={() => (single ? setHoverId(dia) : setPopupDia(dia))}
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

                {isHover && single && (
                  <div
                    className="absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 rounded-lg p-2.5 text-center shadow-lg"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <p className="text-xs font-bold">{single.name}</p>
                    <p className="mt-0.5 text-[0.6875rem] text-muted">
                      {formatFecha(single.fechaMillis)} · {single.rarityPercent.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative ml-[34px]" style={{ height: MONTH_LABEL_HEIGHT_PX }}>
        {etiquetasMes.map((e, i) => (
          <span
            key={i}
            className="absolute top-1 text-[0.5625rem] text-muted"
            style={{ left: `${e.frac * 100}%`, transform: "translateX(-50%)" }}
          >
            {e.texto}
          </span>
        ))}
      </div>

      {grupoPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPopupDia(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">
                {formatFecha(grupoPopup[0].fechaMillis)} · {grupoPopup.length} trofeos
              </p>
              <button
                type="button"
                onClick={() => setPopupDia(null)}
                className="rounded-full px-2 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                Cerrar
              </button>
            </div>
            <div className="space-y-2">
              {grupoPopup.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl p-2" style={{ background: "var(--surface-2)" }}>
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-surface-2 font-bold"
                    style={{ borderColor: colorFor(p.grade) }}
                  >
                    {p.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.iconUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span style={{ color: colorFor(p.grade) }}>{p.grade ? GRADE_LABEL[p.grade][0] : "?"}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.8125rem] font-semibold">{p.name}</p>
                    <p className="text-[0.6875rem] text-muted">
                      {p.grade ? GRADE_LABEL[p.grade] : "?"} · {p.rarityPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Columna de "0%"..."100%" del eje Y, fija a la izquierda. */
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
