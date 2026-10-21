"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "@/components/Enlace";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CompartirImagenWrap } from "@/components/CompartirImagenWrap";
import { TrophyIcon } from "@/components/TrophyIcon";
import type { Rachas } from "@/lib/history";
import type { PercentilAnio } from "@/lib/wrapPercentile";
import type { JuegoDestacado } from "@/components/ParagonWrap";
import type { WrapAnual } from "@/lib/wrapAnual";
import { BarraMetales, BarrasHorizontales, BarrasMeses, Caratula, COLOR_METAL, mejorMesDe } from "@/components/wrap/GraficasWrap";

const MESES_INDICES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;

type TFunction = ReturnType<typeof useTranslations>;

/** 6s por diapositiva: suficiente para leer un número grande y una frase corta. */
const DURACION_MS = 6000;

export interface WrapStoriesData {
  playerName: string;
  topGenre: { name: string; count: number };
  topGame?: JuegoDestacado;
  esteAnio: number;
  juegosEsteAnio: number;
  mejorMes: { mes: string; total: number } | null;
  rachas: Rachas;
  percentil: PercentilAnio | null;
  /** El año en detalle (lib/wrapAnual.ts). */
  anual: WrapAnual;
  /** Opcional: el perfil de ejemplo no tiene handle ni imagen que compartir. */
  handle?: string;
}

interface Slide {
  key: string;
  background: CSSProperties;
  /** Capa de fondo opcional (mosaico de carátulas, carátula difuminada). */
  fondo?: ReactNode;
  content: ReactNode;
}

/**
 * Wrap en formato Stories: la misma información que las tres tarjetas de
 * `ParagonWrap`, ampliada con lo que ya se calcula en otras pantallas
 * (`lib/history.ts` para el mes mejor y la racha, `lib/wrapPercentile.ts`
 * para la comparación mundial) pero que nunca tenía sitio en la portada del
 * perfil. Ningún dato nuevo: es una segunda forma de enseñar lo que ya
 * existe, a pantalla completa y una idea a la vez.
 *
 * Avanza sola cada `DURACION_MS` (con barras de progreso arriba, como
 * cualquier Stories), se pausa mientras se mantiene pulsado, y también se
 * controla a mano: tocar/clicar la mitad izquierda o derecha, flechas del
 * teclado, Esc para cerrar — mismo lenguaje que ya usa el visor de capturas
 * de `ScreenshotStrip.tsx`.
 */
export function WrapStories({ data, onClose }: { data: WrapStoriesData; onClose: () => void }) {
  const t = useTranslations("Perfil");
  const locale = useLocale();
  const slides = useMemo<Slide[]>(() => buildSlides(data, t, locale), [data, t, locale]);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const pausedRef = useRef(false);
  const elapsedRef = useRef(0);
  // eslint-disable-next-line react-hooks/purity -- valor inicial del ref; el efecto de abajo lo reinicia antes de usarlo.
  const lastRef = useRef(Date.now());

  const total = slides.length;

  // El índice actual en un ref: `next` se llama desde el bucle de animación y
  // desde el teclado. Antes se cerraba llamando a `onClose` DENTRO del
  // actualizador de `setIndex`, y React avisaba de un setState del padre en
  // pleno render ("Cannot update a component while rendering…").
  const indexRef = useRef(0);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  function next() {
    if (indexRef.current >= total - 1) {
      onClose();
      return;
    }
    setIndex(indexRef.current + 1);
  }

  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  useEffect(() => {
    elapsedRef.current = 0;
    lastRef.current = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reinicia la barra de progreso al cambiar de diapositiva, junto con el bucle de animación que arranca aquí.
    setProgress(0);
    let raf: number;

    function tick() {
      const now = Date.now();
      if (!pausedRef.current) elapsedRef.current += now - lastRef.current;
      lastRef.current = now;

      const pct = Math.min(100, (elapsedRef.current / DURACION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        next();
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " ") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  if (total === 0) return null;
  const slide = slides[index];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onPointerDown={() => { pausedRef.current = true; }}
      onPointerUp={() => { pausedRef.current = false; }}
      onPointerLeave={() => { pausedRef.current = false; }}
    >
      <div
        className="relative flex h-full max-h-[780px] w-full max-w-[420px] flex-col overflow-hidden rounded-[24px] shadow-2xl"
        style={slide.background}
      >
        {slide.fondo && <div className="pointer-events-none absolute inset-0 z-0">{slide.fondo}</div>}
        <div className="absolute inset-x-3 top-3 z-20 flex gap-1.5">
          {slides.map((s, i) => (
            <div key={s.key} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${i < index ? 100 : i === index ? progress : 0}%` }}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          aria-label={t("WrapStories.cerrar")}
          onClick={onClose}
          className="absolute right-3 top-8 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50"
        >
          <X size={18} />
        </button>

        {/* Zonas de toque, debajo del contenido interactivo (compartir/enlaces) */}
        <button type="button" aria-label={t("WrapStories.anterior")} onClick={prev} className="absolute inset-y-0 left-0 z-10 w-[35%]" />
        <button type="button" aria-label={t("WrapStories.siguiente")} onClick={next} className="absolute inset-y-0 right-0 z-10 w-[65%]" />

        {/* Con `key`, cada diapositiva vuelve a montar su contenido y la
            entrada escalonada (.wrap-entrar) se repite en cada una. */}
        <div key={slide.key} className="wrap-entrar relative z-10 flex h-full flex-col justify-center p-8">{slide.content}</div>
      </div>
    </div>
  );
}

/** Mosaico de carátulas inclinado de fondo (portada y cierre), oscurecido para que se lea el texto. */
function MosaicoCaratulas({ juegos }: { juegos: { gameId: string; iconUrl: string | null; titulo: string }[] }) {
  if (juegos.length === 0) return null;
  const celdas = Array.from({ length: 16 }, (_, i) => juegos[i % juegos.length]);
  return (
    <>
      <div className="absolute -inset-[30%] grid rotate-[-12deg] grid-cols-4 gap-3 opacity-45">
        {celdas.map((j, i) => (
          <Caratula key={i} gameId={j.gameId} iconUrl={j.iconUrl} titulo="" className="aspect-square rounded-xl" />
        ))}
      </div>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,10,15,0.55) 0%, rgba(8,10,15,0.8) 55%, rgba(8,10,15,0.97) 100%)" }} />
    </>
  );
}

/** Carátula difuminada a sangre (diapositiva del juego más exprimido). */
function CaratulaDifuminada({ gameId, iconUrl }: { gameId: string; iconUrl: string | null }) {
  return (
    <>
      <Caratula gameId={gameId} iconUrl={iconUrl} titulo="" className="absolute -inset-10 scale-110 blur-2xl" />
      <div className="absolute inset-0 bg-black/55" />
    </>
  );
}

/** Número que cuenta desde cero al entrar (sin animación si se pide menos movimiento). */
function Contador({ valor, locale }: { valor: number; locale: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    // Con menos movimiento, la animación dura 0: el primer fotograma ya es el número final.
    const duracion = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1100;
    const inicio = performance.now();
    let raf = 0;
    const paso = (ahora: number) => {
      const p = duracion === 0 ? 1 : Math.min(1, (ahora - inicio) / duracion);
      setN(Math.round(valor * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor]);
  return <>{n.toLocaleString(locale)}</>;
}

const FONDO_OSCURO: CSSProperties = { background: "linear-gradient(160deg, #141a24, #0b0f16)" };
const ROTULO = "text-xs font-bold uppercase tracking-[0.16em] text-white/60";

function buildSlides(data: WrapStoriesData, t: TFunction, locale: string): Slide[] {
  const { playerName, topGenre, topGame, esteAnio, juegosEsteAnio, rachas, percentil, handle, anual } = data;

  // Sin ningún trofeo con fecha este año no hay historia que contar todavía
  // — una sola diapositiva honesta, no siete vacías simuladas.
  if (esteAnio === 0) {
    return [
      {
        key: "vacio",
        background: FONDO_OSCURO,
        content: (
          <div className="text-center text-white">
            <h2 className="font-heading text-2xl font-bold">{t("WrapStories.vacioTitulo", { playerName })}</h2>
            <p className="mt-3 text-sm text-white/70">{t("WrapStories.vacioTexto")}</p>
          </div>
        ),
      },
    ];
  }

  // Rediseño (21 oct 2026): cada diapositiva enseña algo de verdad (tus
  // carátulas, una gráfica, un ranking) en vez de un degradado, un emoji y
  // un número. Mismo fondo oscuro para todas: lo que cambia es el contenido.
  // El mejor mes de ESTE año (el de `mejorMes` es el de siempre): el mismo que destaca la gráfica.
  const mejorDelAnio = mejorMesDe(anual.porMes);
  const caratulasAnio = [...anual.platinos, ...anual.topJuegos].filter(
    (j, i, todos) => todos.findIndex((o) => o.gameId === j.gameId) === i,
  );
  const slides: Slide[] = [
    {
      key: "portada",
      background: FONDO_OSCURO,
      fondo: <MosaicoCaratulas juegos={caratulasAnio} />,
      content: (
        <>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-text)]">{t("WrapStories.marca")} · {anual.anio}</p>
          <h2 className="font-heading mt-3 text-3xl font-bold leading-tight text-white">
            {t.rich("WrapStories.portadaTitulo", { playerName, br: () => <br /> })}
          </h2>
          <p className="font-heading mt-10 text-8xl font-bold leading-none text-white">
            <Contador valor={esteAnio} locale={locale} />
          </p>
          <p className="mt-2 text-sm font-semibold text-white/80">
            {t.rich("WrapStories.trofeosConseguidos", { br: () => " " })}
          </p>
        </>
      ),
    },
    {
      key: "meses",
      background: FONDO_OSCURO,
      content: (
        <>
          <p className={ROTULO}>{t("WrapStories.mesAMes")}</p>
          {mejorDelAnio && (
            <h2 className="font-heading mt-3 text-3xl font-bold leading-tight text-white">
              {t("WrapStories.mejorMesTexto", { mes: t(`WrapStories.meses.${MESES_INDICES[mejorDelAnio.mes - 1]}`), total: mejorDelAnio.total })}
            </h2>
          )}
          <div className="mt-8">
            <BarrasMeses porMes={anual.porMes} locale={locale} alto={220} animar etiqueta={(mes, total) => t("WrapStories.mesTrofeos", { mes, total })} />
          </div>
        </>
      ),
    },
    {
      key: "metales",
      background: FONDO_OSCURO,
      content: (
        <>
          <p className={ROTULO}>{t("WrapStories.metalesTitulo")}</p>
          <ul className="mt-6 flex flex-col gap-4">
            {(["platinum", "gold", "silver", "bronze"] as const)
              .filter((k) => anual.porMetal[k] > 0)
              .map((k) => (
                <li key={k} className="flex items-center gap-4">
                  <TrophyIcon grade={k} size={36} />
                  <span className="font-heading text-5xl font-bold leading-none text-white tabular-nums">{anual.porMetal[k].toLocaleString(locale)}</span>
                  <span className="h-1.5 flex-1 rounded-full" style={{ background: COLOR_METAL[k], opacity: 0.35 }} aria-hidden="true" />
                </li>
              ))}
          </ul>
          <div className="mt-8">
            <BarraMetales porMetal={anual.porMetal} etiquetaOtros={t("WrapStories.logrosSinMetal")} grosor={14} />
          </div>
        </>
      ),
    },
  ];

  if (anual.topJuegos.length > 0) {
    slides.push({
      key: "top",
      background: FONDO_OSCURO,
      content: (
        <>
          <p className={ROTULO}>{t("WrapStories.topJuegosTitulo")}</p>
          <ol className="mt-6 flex flex-col gap-4">
            {anual.topJuegos.map((j, i) => (
              <li key={j.gameId} className="flex items-center gap-4">
                <span className="w-6 shrink-0 font-heading text-2xl font-bold text-white/40">{i + 1}</span>
                <Caratula gameId={j.gameId} iconUrl={j.iconUrl} titulo={j.titulo} className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{j.titulo}</p>
                  <p className="text-sm text-white/60">{t("WrapStories.trofeosConseguidosCount", { n: j.trofeos })}</p>
                </div>
              </li>
            ))}
          </ol>
        </>
      ),
    });
  }

  if (topGame) {
    slides.push({
      key: "juego",
      background: FONDO_OSCURO,
      fondo: <CaratulaDifuminada gameId={topGame.game.id} iconUrl={topGame.game.iconUrl ?? null} />,
      content: (
        <>
          <p className={ROTULO}>{t("WrapStories.juegoMasExprimido")}</p>
          <Caratula
            gameId={topGame.game.id}
            iconUrl={topGame.game.iconUrl ?? null}
            titulo={topGame.game.title}
            className="mt-6 aspect-square w-44 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
          />
          <h2 className="font-heading mt-6 text-3xl font-bold leading-tight text-white">{topGame.game.title}</h2>
          <p className="mt-2 text-sm font-medium text-white/80">
            {topGame.horasTotal > 0
              ? t("WrapStories.horasJugadas", { horas: topGame.horasTotal.toFixed(1) })
              : t("WrapStories.trofeosConseguidosCount", { n: topGame.game.earnedTotal })}
          </p>
        </>
      ),
    });
  }

  if (anual.platinos.length > 0) {
    slides.push({
      key: "platinos",
      background: FONDO_OSCURO,
      content: (
        <>
          <p className={ROTULO}>{t("WrapStories.platinosTitulo")}</p>
          <p className="font-heading mt-3 text-6xl font-bold leading-none" style={{ color: "var(--platinum)" }}>
            {t("WrapStories.platinosCount", { count: anual.platinos.length })}
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2.5">
            {anual.platinos.slice(0, 9).map((p) => (
              <Caratula key={p.gameId} gameId={p.gameId} iconUrl={p.iconUrl} titulo={p.titulo} className="aspect-square rounded-xl ring-1 ring-[rgb(159_212_236/0.4)]" />
            ))}
          </div>
        </>
      ),
    });
  }

  if (anual.masRaro) {
    slides.push({
      key: "raro",
      background: FONDO_OSCURO,
      content: (
        <>
          <p className={ROTULO}>{t("WrapStories.raroTitulo")}</p>
          <div className="mt-8"><TrophyIcon grade={anual.masRaro.grado ?? "gold"} size={72} /></div>
          <h2 className="font-heading mt-6 text-3xl font-bold leading-tight text-white">{anual.masRaro.nombre}</h2>
          <p className="mt-1 text-sm text-white/60">{anual.masRaro.juego}</p>
          <p className="mt-6 text-sm text-white/80">
            {t.rich("WrapStories.raroTexto", {
              rareza: anual.masRaro.rareza.toLocaleString(locale, { maximumFractionDigits: 1 }),
              b: (c) => <strong className="font-heading text-4xl text-white">{c}</strong>,
              br: () => <br />,
            })}
          </p>
        </>
      ),
    });
  }

  if (anual.generos.length > 0 || topGenre.count > 0) {
    slides.push({
      key: "genero",
      background: FONDO_OSCURO,
      content: (
        <>
          <p className={ROTULO}>{t("WrapStories.generoMasJugado")}</p>
          <h2 className="font-heading mt-3 text-4xl font-bold text-white">{anual.generos[0]?.nombre ?? topGenre.name}</h2>
          {anual.generos.length > 0 && (
            <div className="mt-8">
              <BarrasHorizontales
                filas={anual.generos.map((g) => ({ clave: g.nombre, etiqueta: g.nombre, valor: g.juegos }))}
              />
              <p className="mt-3 text-xs text-white/50">{t("WrapStories.generosNota")}</p>
            </div>
          )}
        </>
      ),
    });
  }

  if (rachas.mejor > 0) {
    slides.push({
      key: "racha",
      background: FONDO_OSCURO,
      content: (
        <>
          <p className={ROTULO}>{t("WrapStories.racha")}</p>
          <p className="font-heading mt-6 text-8xl font-bold leading-none text-white">
            <Contador valor={rachas.mejor} locale={locale} />
          </p>
          <p className="mt-2 text-sm text-white/80">{t("WrapStories.diaSeguido", { count: rachas.mejor })}</p>
          <p className="mt-6 text-sm text-white/60">{t("WrapStories.diaDistinto", { count: rachas.diasActivos })}</p>
        </>
      ),
    });
  }

  if (percentil) {
    slides.push({
      key: "percentil",
      background: FONDO_OSCURO,
      content: (
        <>
          <p className={ROTULO}>{t("WrapStories.comoTeComparas")}</p>
          <h2 className="font-heading mt-6 text-6xl font-bold text-white">{t("WrapStories.topPercentil", { percentil: percentil.percentil })}</h2>
          <p className="mt-4 text-sm text-white/70">
            {t("WrapStories.percentilTexto", { total: percentil.totalUsuarios, percentil: percentil.percentil })}
          </p>
        </>
      ),
    });
  }

  slides.push({
    key: "cierre",
    background: FONDO_OSCURO,
    fondo: <MosaicoCaratulas juegos={caratulasAnio} />,
    content: (
      <>
        <h2 className="font-heading text-3xl font-bold leading-tight text-white">
          {t("WrapStories.cierreTitulo", { esteAnio, count: juegosEsteAnio })}
        </h2>
        <p className="mt-3 text-sm text-white/70">{t("WrapStories.cierreSubtitulo")}</p>
        <div className="relative z-20 mt-8 flex flex-col gap-2.5">
          {handle && <CompartirImagenWrap handle={handle} />}
          <Link
            href="/ritmo"
            className="rounded-xl px-4 py-2.5 text-center text-[0.8125rem] font-bold transition-colors hover:bg-white/10"
            style={{ border: "1px solid rgba(255,255,255,0.25)", color: "white" }}
          >
            {t("WrapStories.verMesAMes")}
          </Link>
        </div>
      </>
    ),
  });

  return slides;
}
