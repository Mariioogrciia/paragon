"use client";

import { useRef } from "react";

/**
 * Fila con scroll horizontal y flechas de paginación — a diferencia de
 * `FilaHorizontal` (cinta que se mueve sola) esto no se anima: el usuario
 * manda con los botones o arrastrando. Para "Recomendado"/"Tendencia" en la
 * página de plataforma, donde una cinta automática ya se usa en Descubrir y
 * repetirla aquí volvía monótono todo el sitio.
 */
export function CardCarousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function mover(direccion: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direccion * el.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <div className="group/carousel relative">
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto scroll-smooth pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {children}
      </div>
      <button
        type="button"
        aria-label="Anterior"
        onClick={() => mover(-1)}
        className="absolute left-0 top-1/2 hidden h-9 w-9 -translate-x-3 -translate-y-1/2 items-center justify-center rounded-full text-lg font-bold shadow-lg transition-opacity sm:flex"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Siguiente"
        onClick={() => mover(1)}
        className="absolute right-0 top-1/2 hidden h-9 w-9 -translate-y-1/2 translate-x-3 items-center justify-center rounded-full text-lg font-bold shadow-lg transition-opacity sm:flex"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        ›
      </button>
    </div>
  );
}
