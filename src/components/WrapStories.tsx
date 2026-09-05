"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { CompartirImagenWrap } from "@/components/CompartirImagenWrap";
import { TrophyIcon } from "@/components/TrophyIcon";
import { coverGradient } from "@/lib/design";
import type { MesConTrofeos, Rachas } from "@/lib/history";
import type { PercentilAnio } from "@/lib/wrapPercentile";
import type { JuegoDestacado } from "@/components/ParagonWrap";

const MESES_CORTOS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function nombreMes(clave: string): string {
  const [, mes] = clave.split("-");
  return MESES_CORTOS[Number(mes) - 1] ?? mes;
}

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
  /** Opcional: el perfil de ejemplo no tiene handle ni imagen que compartir. */
  handle?: string;
}

interface Slide {
  key: string;
  background: CSSProperties;
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
  const slides = useMemo<Slide[]>(() => buildSlides(data), [data]);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const pausedRef = useRef(false);
  const elapsedRef = useRef(0);
  const lastRef = useRef(Date.now());

  const total = slides.length;

  function next() {
    setIndex((i) => {
      if (i >= total - 1) {
        onClose();
        return i;
      }
      return i + 1;
    });
  }

  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  useEffect(() => {
    elapsedRef.current = 0;
    lastRef.current = Date.now();
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
          aria-label="Cerrar"
          onClick={onClose}
          className="absolute right-3 top-8 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50"
        >
          <X size={18} />
        </button>

        {/* Zonas de toque, debajo del contenido interactivo (compartir/enlaces) */}
        <button type="button" aria-label="Anterior" onClick={prev} className="absolute inset-y-0 left-0 z-10 w-[35%]" />
        <button type="button" aria-label="Siguiente" onClick={next} className="absolute inset-y-0 right-0 z-10 w-[65%]" />

        <div className="relative z-10 flex h-full flex-col justify-center p-8">{slide.content}</div>
      </div>
    </div>
  );
}

function buildSlides(data: WrapStoriesData): Slide[] {
  const { playerName, topGenre, topGame, esteAnio, juegosEsteAnio, mejorMes, rachas, percentil, handle } = data;

  // Sin ningún trofeo con fecha este año no hay historia que contar todavía
  // — una sola diapositiva honesta, no siete vacías simuladas.
  if (esteAnio === 0) {
    return [
      {
        key: "vacio",
        background: { background: "linear-gradient(150deg, #1c2433, #10141c)" },
        content: (
          <div className="text-center text-white">
            <p className="text-5xl">✨</p>
            <h2 className="font-heading mt-5 text-2xl font-bold">Todavía no hay Wrap para {playerName}</h2>
            <p className="mt-3 text-sm text-white/70">
              En cuanto tengas trofeos con fecha registrada este año, aparecen aquí.
            </p>
          </div>
        ),
      },
    ];
  }

  const slides: Slide[] = [
    {
      key: "portada",
      background: { background: "linear-gradient(150deg, #5a3410, #3a1f08 70%, #241305)" },
      content: (
        <div className="text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#fcd34d]">Paragon Wrap</p>
          <h2 className="font-heading mt-3 text-3xl font-bold leading-tight">Así fue tu año,<br />{playerName}</h2>
          <div className="mt-8 flex items-end gap-3">
            <p className="font-heading text-7xl font-bold leading-none">{esteAnio}</p>
            <p className="pb-2 text-sm font-semibold text-white/80">
              trofeos<br />conseguidos
            </p>
          </div>
          <div className="mt-6 opacity-70"><TrophyIcon grade="gold" size={40} /></div>
        </div>
      ),
    },
    {
      key: "genero",
      background: { background: "linear-gradient(150deg, #3b1d6e, #1c1040 70%, #120a26)" },
      content: (
        <div className="text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c4b5fd]">Género más jugado</p>
          <p className="mt-6 text-6xl">🎮</p>
          <h2 className="font-heading mt-6 text-4xl font-bold">{topGenre.name}</h2>
          <p className="mt-3 text-sm text-white/70">
            {topGenre.count === 1 ? "1 título de este género" : `${topGenre.count} títulos de este género`}
          </p>
        </div>
      ),
    },
  ];

  if (topGame) {
    slides.push({
      key: "juego",
      // Overlay oscuro apilado en el propio `background` (no un <div> aparte
      // encima): así cubre la tarjeta entera sin depender de que el texto
      // "adivine" el tamaño del padre, que es lo que rompía con position:absolute.
      background: { background: `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), ${coverGradient(topGame.game.id)}` },
      content: (
        <div className="text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a8ccff]">Juego más exprimido</p>
          <h2 className="font-heading mt-6 text-4xl font-bold leading-tight">{topGame.game.title}</h2>
          <p className="mt-3 text-sm font-medium text-white/80">
            {topGame.horasTotal > 0
              ? `${topGame.horasTotal.toFixed(1)} horas jugadas`
              : `${topGame.game.earnedTotal} trofeos conseguidos`}
          </p>
        </div>
      ),
    });
  }

  if (mejorMes && mejorMes.total > 0) {
    slides.push({
      key: "mejor-mes",
      background: { background: "linear-gradient(150deg, #14202c, #0d131c)" },
      content: (
        <div className="text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9fd4ec]">Tu mejor mes</p>
          <h2 className="font-heading mt-6 text-4xl font-bold">{nombreMes(mejorMes.mes)}</h2>
          <div className="mt-4 flex items-end gap-2">
            <p className="font-heading text-6xl font-bold text-platinum">{mejorMes.total}</p>
            <p className="pb-1 text-sm text-white/70">trofeos ese mes</p>
          </div>
        </div>
      ),
    });
  }

  if (rachas.mejor > 0) {
    slides.push({
      key: "racha",
      background: { background: "linear-gradient(150deg, #0f3d2e, #0a2620 70%, #061715)" },
      content: (
        <div className="text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6ee7b7]">Racha</p>
          <p className="mt-6 text-6xl">🔥</p>
          <div className="mt-4 flex items-end gap-2">
            <p className="font-heading text-6xl font-bold">{rachas.mejor}</p>
            <p className="pb-1 text-sm text-white/70">{rachas.mejor === 1 ? "día seguido, tu mejor racha" : "días seguidos, tu mejor racha"}</p>
          </div>
          <p className="mt-3 text-sm text-white/70">
            {rachas.diasActivos} {rachas.diasActivos === 1 ? "día distinto" : "días distintos"} cazando trofeos en total
          </p>
        </div>
      ),
    });
  }

  if (percentil) {
    slides.push({
      key: "percentil",
      background: { background: "linear-gradient(150deg, #2c2438, #1a1522 70%, #100d16)" },
      content: (
        <div className="text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e2b53e]">Cómo te comparas</p>
          <h2 className="font-heading mt-6 text-5xl font-bold">Top {percentil.percentil}%</h2>
          <p className="mt-4 text-sm text-white/70">
            De {percentil.totalUsuarios} personas con trofeos este año en Paragon, menos de {percentil.percentil}%
            han conseguido más que tú.
          </p>
        </div>
      ),
    });
  }

  slides.push({
    key: "cierre",
    background: { background: "linear-gradient(150deg, #1c2433, #10141c)" },
    content: (
      <div className="text-white">
        <p className="text-5xl">🏆</p>
        <h2 className="font-heading mt-5 text-2xl font-bold">
          {esteAnio} trofeos repartidos en {juegosEsteAnio} {juegosEsteAnio === 1 ? "juego" : "juegos"}
        </h2>
        <p className="mt-3 text-sm text-white/70">Ese fue tu año en Paragon.</p>
        <div className="mt-8 flex flex-col gap-2.5">
          {handle && <CompartirImagenWrap handle={handle} />}
          <Link
            href="/ritmo"
            className="rounded-xl px-4 py-2.5 text-center text-[13px] font-bold transition-colors hover:bg-white/10"
            style={{ border: "1px solid rgba(255,255,255,0.25)", color: "white" }}
          >
            Ver mes a mes →
          </Link>
        </div>
      </div>
    ),
  });

  return slides;
}
