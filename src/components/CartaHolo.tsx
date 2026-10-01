"use client";

import { useRef } from "react";

/**
 * Carta coleccionable del perfil: el brillo holográfico y un giro leve siguen
 * al puntero (variables CSS, sin re-render). Con movimiento reducido o en
 * táctil se queda quieta, con el brillo fijo. Ver `.carta-holo` en globals.css.
 */
export function CartaHolo({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function mover(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.style.setProperty("--rx", `${(0.5 - y) * 8}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 10}deg`);
  }

  function salir() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div ref={ref} onPointerMove={mover} onPointerLeave={salir} className={`carta-holo ${className}`}>
      {children}
    </div>
  );
}
