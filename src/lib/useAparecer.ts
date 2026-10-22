"use client";

import { useCallback, useState } from "react";

/**
 * "Aparece al entrar en pantalla" sin framer-motion (22 oct 2026): un
 * IntersectionObserver que se apaga a la primera. El componente pone
 * `data-visible` con lo que devuelve y el CSS (`.aparecer` y
 * `.aparecer-escala` en globals.css) hace la transición. framer-motion eran
 * 42 KB comprimidos en cada página con una cifra destacada.
 *
 * `margen` adelanta o retrasa el momento, como el `viewport.margin` de antes.
 */
export function useAparecer<T extends Element>(margen = "0px") {
  const [visible, setVisible] = useState(false);
  const ref = useCallback(
    (el: T | null) => {
      if (!el || visible) return;
      if (typeof IntersectionObserver === "undefined") {
        setVisible(true);
        return;
      }
      const observador = new IntersectionObserver(
        (entradas) => {
          if (entradas.some((e) => e.isIntersecting)) {
            setVisible(true);
            observador.disconnect();
          }
        },
        // El margen de arriba, enorme: lo que ya quedó POR ENCIMA de la
        // pantalla cuenta como visto. Si no, un salto (un enlace a una
        // sección, volver atrás y recuperar el scroll) que pasa por encima
        // de una cifra sin cruzarla la dejaba invisible para siempre.
        { rootMargin: `100000px 0px ${margen} 0px` },
      );
      observador.observe(el);
      return () => observador.disconnect();
    },
    [visible, margen],
  );
  return [ref, visible] as const;
}
