"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Tira de capturas de IGDB, en scroll horizontal — solo se pinta si el
 * juego tiene alguna. Mismas flechas de paginación que `GameVideos`, para
 * que las dos tiras de la ficha se controlen igual.
 *
 * `loading="lazy"` en una tira tan larga (algunos juegos traen 15-20
 * capturas) dejaba huecos negros lisos donde una imagen aún no había
 * cargado — el navegador no las precarga por estar "lejos" horizontalmente,
 * aunque la tira entera esté arriba del todo de la página. El fondo
 * (`bg-surface-2`, el mismo gris de carga que ya usa el resto de la app)
 * rellena ese hueco mientras carga, en vez de un negro plano que parece
 * roto. Las primeras 6 (las que se ven sin desplazar en la mayoría de
 * pantallas) cargan sin esperar — son las que se ven nada más entrar.
 *
 * Clic en una abre un visor a pantalla completa (antes abría la imagen en
 * pestaña nueva) — con Esc para cerrar y flechas del teclado para moverse,
 * más los mismos controles en pantalla.
 */
export function ScreenshotStrip({ screenshots, title }: { screenshots: string[]; title: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [abierta, setAbierta] = useState<number | null>(null);

  useEffect(() => {
    if (abierta === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierta(null);
      else if (e.key === "ArrowLeft") setAbierta((i) => (i === null ? i : (i - 1 + screenshots.length) % screenshots.length));
      else if (e.key === "ArrowRight") setAbierta((i) => (i === null ? i : (i + 1) % screenshots.length));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierta, screenshots.length]);

  if (screenshots.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: direction === "left" ? -400 : 400, behavior: "smooth" });
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">Capturas de pantalla</h2>
        {screenshots.length > 2 && (
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => scroll("left")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-border text-muted transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              onClick={() => scroll("right")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-border text-muted transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
      <div ref={scrollRef} className="-mx-1 flex gap-3 overflow-x-auto px-1 py-1" style={{ scrollbarWidth: "none" }}>
        {screenshots.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setAbierta(i)}
            className="block aspect-video w-64 shrink-0 overflow-hidden rounded-xl bg-surface-2"
            style={{ border: "1px solid var(--border)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Captura de ${title} ${i + 1}`}
              className="h-full w-full object-cover"
              loading={i < 6 ? "eager" : "lazy"}
            />
          </button>
        ))}
      </div>

      {abierta !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setAbierta(null)}>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setAbierta(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X size={20} />
          </button>

          {screenshots.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Anterior"
                onClick={(e) => {
                  e.stopPropagation();
                  setAbierta((i) => (i === null ? i : (i - 1 + screenshots.length) % screenshots.length));
                }}
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-4"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                aria-label="Siguiente"
                onClick={(e) => {
                  e.stopPropagation();
                  setAbierta((i) => (i === null ? i : (i + 1) % screenshots.length));
                }}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-4"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screenshots[abierta]}
            alt={`Captura de ${title} ${abierta + 1}`}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
            {abierta + 1} / {screenshots.length}
          </span>
        </div>
      )}
    </section>
  );
}
