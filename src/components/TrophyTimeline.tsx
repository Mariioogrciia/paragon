"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { colorFor } from "@/lib/design";
import { GRADES, type Trophy, type TrophyGrade } from "@/lib/types";

/** Alto del área de puntos (sin la fila de meses de abajo). */
const PLOT_HEIGHT_PX = 300;

/** Alto de la fila de meses. */
const MONTH_LABEL_HEIGHT_PX = 30;

/** Margen a los cuatro lados del área de puntos — sin esto, un trofeo con
 * 0%/100% de rareza exacto, o del primer/último día, queda con el centro
 * justo en el borde. */
const MARKER_PADDING_PX = 24;

/** Niveles de zoom del eje del tiempo (15 nov 2026): el ancho de la gráfica, en veces el visible. */
const ZOOMS = [1, 2, 4, 8, 16];

/** Techos posibles con «Ajustar altura»: sus cuartos son números redondos (80 → 20, 40, 60, 80). */
const TECHOS = [4, 8, 12, 20, 40, 60, 80, 100];

/** Hueco a cada lado dentro del área con scroll, para que las burbujas de los bordes no se corten. */
const MARGEN_X_PX = 22;

/** "25%", "12,5%"… */
function porcentaje(v: number, locale: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v)}%`;
}

function formatFecha(millis: number, locale: string): string {
  return new Date(millis).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
 * disponible. Zoom (15 nov 2026): con + y − (o Ctrl + rueda) el eje del
 * tiempo se estira y se recorre con scroll o arrastrando; y «Ajustar altura»
 * estira el eje de la rareza hasta el trofeo más común, para que no se
 * amontone todo arriba cuando casi todo es raro. El eje X usa
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
  const t = useTranslations("Analitica.trophyTimeline");
  const locale = useLocale();
  const GRADE_LABEL: Record<TrophyGrade, string> = {
    platinum: t("platino"),
    gold: t("oro"),
    silver: t("plata"),
    bronze: t("bronce"),
  };
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [popupDia, setPopupDia] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [ajustada, setAjustada] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  // Para que el zoom no te mueva de sitio: qué fracción del ancho había bajo
  // el punto de referencia (el centro, o el ratón con Ctrl + rueda).
  const ancla = useRef<{ frac: number; x: number } | null>(null);
  const arrastre = useRef<{
    x: number;
    scroll: number;
    movido: boolean;
  } | null>(null);

  const cambiarZoom = (nuevo: number, xEnVista?: number) => {
    const el = scroller.current;
    const z = Math.min(ZOOMS[ZOOMS.length - 1], Math.max(1, nuevo));
    if (el && z !== zoom) {
      const x = xEnVista ?? el.clientWidth / 2;
      ancla.current = { frac: (el.scrollLeft + x) / el.scrollWidth, x };
    }
    setZoom(z);
  };

  useEffect(() => {
    const el = scroller.current;
    if (!el || !ancla.current) return;
    el.scrollLeft = ancla.current.frac * el.scrollWidth - ancla.current.x;
    ancla.current = null;
  }, [zoom]);

  // Ctrl + rueda (y el pellizco del trackpad, que llega así): zoom donde está
  // el ratón. Con listener propio porque React registra la rueda como pasiva
  // y no deja cancelar el zoom de la página. Se pone una sola vez, con el
  // ref de la caja (React 19 limpia con lo que devuelve), y lee el zoom de
  // un ref. El pellizco manda decenas de eventos pequeños: se acumulan y se
  // sube o baja un nivel cada ~50 px de rueda, no uno por evento.
  const zoomActual = useRef(zoom);
  useEffect(() => {
    zoomActual.current = zoom;
  }, [zoom]);
  const ponerScroller = useCallback((el: HTMLDivElement | null) => {
    scroller.current = el;
    if (!el) return;
    let acumulado = 0;
    let ultimo = 0;
    const rueda = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (e.timeStamp - ultimo > 400) acumulado = 0;
      ultimo = e.timeStamp;
      acumulado += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      if (Math.abs(acumulado) < 50) return;
      const actual = zoomActual.current;
      const i = ZOOMS.indexOf(actual);
      const siguiente = acumulado < 0 ? ZOOMS[Math.min(ZOOMS.length - 1, i + 1)] : ZOOMS[Math.max(0, i - 1)];
      acumulado = 0;
      if (siguiente === actual) return;
      const x = e.clientX - el.getBoundingClientRect().left;
      ancla.current = { frac: (el.scrollLeft + x) / el.scrollWidth, x };
      zoomActual.current = siguiente;
      setZoom(siguiente);
    };
    el.addEventListener("wheel", rueda, { passive: false });
    return () => el.removeEventListener("wheel", rueda);
  }, []);

  // La tarjeta de un trofeo suelto (16 nov 2026): fuera de la caja con
  // scroll, en el body y con posición fija, para que no la corten ni los
  // bordes ni el scroll; dentro de la pantalla siempre.
  const [tarjeta, setTarjeta] = useState<{ dia: string; x: number; y: number; arriba: boolean } | null>(null);
  const abrirTarjeta = (dia: string, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const arriba = r.top > 100;
    const x = Math.min(window.innerWidth - 8 - 96, Math.max(8 + 96, r.left + r.width / 2));
    setTarjeta({ dia, x, y: arriba ? r.top - 8 : r.bottom + 8, arriba });
  };
  useEffect(() => {
    if (!tarjeta) return;
    const cerrar = () => setTarjeta(null);
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    return () => {
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [tarjeta]);

  const puntos = trophies
    .filter((t): t is Trophy & { earnedAt: string; rarityPercent: number } => t.earned && !!t.earnedAt && t.rarityPercent != null)
    .map((t) => ({ ...t, fechaMillis: new Date(t.earnedAt).getTime() }))
    .sort((a, b) => a.fechaMillis - b.fechaMillis);

  if (puntos.length < 2) {
    return <p className="py-8 text-center text-sm text-muted">{t("minimoDatos")}</p>;
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
  // Mes arriba y año completo debajo (15 nov 2026): "ene 16" se leía como
  // un día. El año va resaltado en la primera etiqueta de cada año.
  const etiquetasMes: {
    frac: number;
    mes: string;
    anio: string;
    anioNuevo: boolean;
  }[] = [];
  let anioAnterior = "";
  let mesAnterior = "";
  let fracUltimaEtiqueta = -Infinity;
  diasOrdenados.forEach((dia) => {
    const mesKey = dia.slice(0, 7);
    if (mesKey === mesAnterior) return;
    const frac = fracPorDia.get(dia) ?? 0;
    if (frac - fracUltimaEtiqueta < GAP_MIN_ETIQUETA_FRAC / zoom) return;
    mesAnterior = mesKey;
    fracUltimaEtiqueta = frac;
    const anio = dia.slice(0, 4);
    etiquetasMes.push({
      frac,
      mes: new Date(`${dia}T00:00:00Z`).toLocaleDateString(locale, { month: "short", timeZone: "UTC" }).replace(".", ""),
      anio,
      anioNuevo: anio !== anioAnterior,
    });
    anioAnterior = anio;
  });

  // Agregados por día: cuántos trofeos cayeron, su rareza media (posición Y
  // de la burbuja) y el metal más alto presente (color del anillo — GRADES
  // ya viene ordenado platino>oro>plata>bronce).
  const resumenPorDia = diasOrdenados.map((dia) => {
    const grupo = porDia.get(dia)!;
    const rarezaMedia = grupo.reduce((sum, p) => sum + p.rarityPercent, 0) / grupo.length;
    const gradoDominante = GRADES.find((g) => grupo.some((p) => p.grade === g)) ?? grupo[0].grade;
    return {
      dia,
      grupo,
      rarezaMedia,
      gradoDominante,
      frac: fracPorDia.get(dia) ?? 0,
    };
  });

  const gradosPresentes = GRADES.filter((g) => puntos.some((p) => p.grade === g));
  // Altura ajustada: el eje llega hasta el trofeo más común (redondeado a
  // un techo con cuartos redondos: 20, 40, 60, 80…), no siempre hasta 100%.
  const rarezaMax = Math.max(...puntos.map((p) => p.rarityPercent));
  const techo = !ajustada ? 100 : (TECHOS.find((t) => t >= rarezaMax) ?? 100);
  const marcasY = [0, 0.25, 0.5, 0.75, 1].map((f) => f * techo);
  const yPx = (rarity: number) => MARKER_PADDING_PX + (Math.min(rarity, techo) / techo) * (PLOT_HEIGHT_PX - 2 * MARKER_PADDING_PX);
  const xPos = (frac: number) => `calc(${MARGEN_X_PX}px + ${frac} * (100% - ${2 * MARGEN_X_PX}px))`;
  const iZoom = ZOOMS.indexOf(zoom);

  const grupoPopup = popupDia ? porDia.get(popupDia) : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        {gradosPresentes.length > 1 &&
          gradosPresentes.map((g) => (
            <div key={g} className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(g) }} />
              {GRADE_LABEL[g]}
            </div>
          ))}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            aria-pressed={ajustada}
            onClick={() => setAjustada((a) => !a)}
            title={t("ajustarAyuda")}
            className="rounded-full border px-2.5 py-1 text-[0.6875rem] font-bold transition-colors"
            style={
              ajustada
                ? {
                    background: "rgb(var(--accent-rgb) / 0.16)",
                    color: "var(--accent-text)",
                    borderColor: "rgb(var(--accent-rgb) / 0.4)",
                  }
                : { color: "var(--muted)", borderColor: "var(--border)" }
            }
          >
            ↕ {t("ajustar")}
          </button>
          <div className="flex items-center rounded-full border" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              onClick={() => cambiarZoom(ZOOMS[Math.max(0, iZoom - 1)])}
              disabled={iZoom === 0}
              aria-label={t("alejar")}
              title={t("alejar")}
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-muted transition-colors hover:text-foreground disabled:opacity-35"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => cambiarZoom(1)}
              title={t("zoomAyuda")}
              className="min-w-[2.25rem] text-center text-[0.6875rem] font-bold tabular-nums"
              style={{
                color: zoom > 1 ? "var(--accent-text)" : "var(--muted)",
              }}
            >
              {zoom}×
            </button>
            <button
              type="button"
              onClick={() => cambiarZoom(ZOOMS[Math.min(ZOOMS.length - 1, iZoom + 1)])}
              disabled={iZoom === ZOOMS.length - 1}
              aria-label={t("acercar")}
              title={t("acercar")}
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-muted transition-colors hover:text-foreground disabled:opacity-35"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        <EjeY marcas={marcasY} locale={locale} />
        <div
          ref={ponerScroller}
          className={`min-w-0 flex-1 overflow-y-hidden border-l ${zoom > 1 ? "cursor-grab overflow-x-auto active:cursor-grabbing" : "overflow-x-hidden"}`}
          style={{ borderColor: "var(--border)" }}
          // Arrastrar con el ratón para recorrerla con zoom (en el móvil ya se
          // desliza con el dedo). Un arrastre no cuenta como clic en una burbuja.
          onPointerDown={(e) => {
            if (e.pointerType !== "mouse" || e.button !== 0 || zoom === 1) return;
            arrastre.current = {
              x: e.clientX,
              scroll: e.currentTarget.scrollLeft,
              movido: false,
            };
          }}
          onPointerMove={(e) => {
            const a = arrastre.current;
            if (!a) return;
            const dx = e.clientX - a.x;
            if (!a.movido && Math.abs(dx) > 3) {
              a.movido = true;
              // Que el arrastre siga aunque el ratón salga de la caja o pase por una burbuja.
              e.currentTarget.setPointerCapture(e.pointerId);
            }
            if (a.movido) e.currentTarget.scrollLeft = a.scroll - dx;
          }}
          onDragStart={(e) => e.preventDefault()}
          onPointerUp={() => {
            const a = arrastre.current;
            // Se deja un momento para que el clic de después vea que fue un arrastre.
            if (a?.movido) setTimeout(() => (arrastre.current = null), 0);
            else arrastre.current = null;
          }}
          onPointerCancel={() => (arrastre.current = null)}
          onClickCapture={(e) => {
            if (arrastre.current?.movido) {
              e.stopPropagation();
              arrastre.current = null;
            }
          }}
        >
          <div className="relative select-none" style={{ width: `${zoom * 100}%` }}>
            <div className="relative" style={{ height: PLOT_HEIGHT_PX }}>
              {marcasY.map((r) => (
                <div
                  key={r}
                  className="absolute left-0 right-0 h-px"
                  style={{
                    top: yPx(r),
                    background: "var(--border)",
                    opacity: 0.4,
                  }}
                />
              ))}

              {resumenPorDia.map(({ dia, grupo, rarezaMedia, gradoDominante, frac }) => {
                const size = grupo.length === 1 ? 32 : Math.min(24 + grupo.length * 3, 44);
                const single = grupo.length === 1 ? grupo[0] : null;
                const isHover = hoverId === dia;
                return (
                  <div
                    key={dia}
                    className="absolute cursor-pointer"
                    style={{
                      left: xPos(frac),
                      top: yPx(rarezaMedia),
                      transform: `translate(-50%, -50%) scale(${isHover ? 1.15 : 1})`,
                      zIndex: isHover ? 20 : 1,
                      transition: "transform 120ms ease",
                    }}
                    onMouseEnter={(e) => {
                      setHoverId(dia);
                      if (single && !arrastre.current?.movido) abrirTarjeta(dia, e.currentTarget);
                    }}
                    onMouseLeave={() => {
                      setHoverId((id) => (id === dia ? null : id));
                      setTarjeta((tj) => (tj?.dia === dia ? null : tj));
                    }}
                    onClick={(e) => {
                      if (!single) return setPopupDia(dia);
                      setHoverId(dia);
                      abrirTarjeta(dia, e.currentTarget);
                    }}
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
                          <img loading="lazy" decoding="async" draggable={false} src={single.iconUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span style={{ color: colorFor(single.grade) }}>{single.grade ? GRADE_LABEL[single.grade][0] : "?"}</span>
                        )
                      ) : (
                        grupo.length
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

            <div className="relative mt-3" style={{ height: MONTH_LABEL_HEIGHT_PX }}>
              {etiquetasMes.map((e, i) => (
                <span
                  key={i}
                  className="absolute top-1 flex -translate-x-1/2 flex-col items-center whitespace-nowrap text-[0.5625rem] leading-tight text-muted"
                  style={{ left: xPos(e.frac) }}
                >
                  <span>{e.mes}</span>
                  <span className={e.anioNuevo ? "font-bold text-foreground" : "opacity-60"}>{e.anio}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {tarjeta &&
        typeof document !== "undefined" &&
        (() => {
          const p = porDia.get(tarjeta.dia)?.[0];
          if (!p) return null;
          return createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-50 w-48 rounded-lg p-2.5 text-center shadow-lg"
              style={{
                left: tarjeta.x,
                top: tarjeta.y,
                transform: `translate(-50%, ${tarjeta.arriba ? "-100%" : "0"})`,
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <p className="text-xs font-bold">{p.name}</p>
              <p className="mt-0.5 text-[0.6875rem] text-muted">
                {formatFecha(p.fechaMillis, locale)} · {p.rarityPercent.toFixed(1)}%
              </p>
            </div>,
            document.body,
          );
        })()}

      {grupoPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPopupDia(null)}>
          <div
            className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl p-4"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">
                {t("popupTitulo", {
                  fecha: formatFecha(grupoPopup[0].fechaMillis, locale),
                  count: grupoPopup.length,
                })}
              </p>
              <button
                type="button"
                onClick={() => setPopupDia(null)}
                className="rounded-full px-2 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                {t("cerrar")}
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
                      <img loading="lazy" decoding="async" src={p.iconUrl} alt="" className="h-full w-full object-cover" />
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

/** Columna de porcentajes del eje Y, fija a la izquierda (no se mueve con el zoom). */
function EjeY({ marcas, locale }: { marcas: number[]; locale: string }) {
  return (
    <div
      className="flex shrink-0 flex-col justify-between pr-2 text-right text-[0.625rem] text-muted"
      style={{
        width: 38,
        height: PLOT_HEIGHT_PX,
        paddingTop: MARKER_PADDING_PX - 6,
        paddingBottom: MARKER_PADDING_PX - 6,
      }}
    >
      {marcas.map((m) => (
        <span key={m}>{porcentaje(m, locale)}</span>
      ))}
    </div>
  );
}
