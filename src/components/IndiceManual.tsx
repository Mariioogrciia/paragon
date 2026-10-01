"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Índice del manual de "Cómo funciona" (rediseño del 1 oct 2026): fijo a la
 * izquierda en escritorio y tira con scroll arriba en móvil. Marca el
 * capítulo que se está leyendo.
 */
export function IndiceManual({ capitulos, titulo }: { capitulos: { id: string; titulo: string }[]; titulo: string }) {
  const [activo, setActivo] = useState(capitulos[0]?.id);
  const lista = useRef<HTMLOListElement>(null);

  // En móvil el índice es una tira con scroll horizontal: se lleva el
  // capítulo activo a la vista (solo en horizontal, sin mover la página).
  useEffect(() => {
    const ol = lista.current;
    const enlace = ol?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!ol || !enlace || ol.scrollWidth <= ol.clientWidth) return;
    ol.scrollTo({ left: enlace.offsetLeft - 16, behavior: "smooth" });
  }, [activo]);

  useEffect(() => {
    // El capítulo activo es el último cuyo comienzo ya ha pasado el 30 %
    // superior de la pantalla. Más fiable que IntersectionObserver con
    // capítulos de alturas muy distintas y un índice fijo encima en móvil.
    let pendiente = 0;
    const calcular = () => {
      pendiente = 0;
      const linea = window.innerHeight * 0.3;
      let actual = capitulos[0]?.id;
      for (const c of capitulos) {
        const el = document.getElementById(c.id);
        if (el && el.getBoundingClientRect().top <= linea) actual = c.id;
      }
      setActivo(actual);
    };
    const alMover = () => {
      if (!pendiente) pendiente = requestAnimationFrame(calcular);
    };
    calcular();
    window.addEventListener("scroll", alMover, { passive: true });
    window.addEventListener("resize", alMover);
    return () => {
      window.removeEventListener("scroll", alMover);
      window.removeEventListener("resize", alMover);
      if (pendiente) cancelAnimationFrame(pendiente);
    };
  }, [capitulos]);

  return (
    <nav aria-label={titulo} className="manual-indice">
      <p className="manual-indice-rotulo">{titulo}</p>
      <ol ref={lista}>
        {capitulos.map((c, i) => (
          <li key={c.id}>
            <a href={`#${c.id}`} aria-current={activo === c.id ? "location" : undefined} className="manual-indice-enlace">
              <span className="manual-indice-num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              {c.titulo}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
