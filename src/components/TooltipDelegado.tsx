"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * Un solo tooltip para muchos elementos: cualquier hijo con `data-t="texto"`
 * lo enseña al pasar el ratón. Sustituye a un tooltip oculto por celda en
 * los mapas de calor (365 días × su propio <div> con texto y clases largas
 * eran ~300 KB de la página de estadísticas), sin perder el tooltip propio
 * — el `title` nativo tarda en salir y es minúsculo.
 */
export function TooltipDelegado({ children, className }: { children: ReactNode; className?: string }) {
  const caja = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ texto: string; x: number; y: number; ancla: string } | null>(null);

  function mostrar(e: React.PointerEvent) {
    const el = (e.target as Element).closest("[data-t]");
    const cont = caja.current;
    if (!el || !cont) return setTip(null);
    const r = el.getBoundingClientRect();
    const c = cont.getBoundingClientRect();
    const x = r.left - c.left + r.width / 2;
    // Centrado sobre la celda; pegado a su borde cerca de los extremos para
    // que el texto no se salga del mapa.
    const ancla = r.left - c.left < 80 ? "-8px" : c.right - r.right < 80 ? "calc(-100% + 8px)" : "-50%";
    setTip({ texto: el.getAttribute("data-t") ?? "", x, y: r.top - c.top, ancla });
  }

  return (
    <div ref={caja} className={`relative ${className ?? ""}`} onPointerOver={mostrar} onPointerLeave={() => setTip(null)}>
      {children}
      {tip && (
        <div
          className="pointer-events-none absolute z-20 whitespace-nowrap rounded-md px-2 py-1 text-[0.6875rem] font-semibold shadow-lg"
          style={{
            left: tip.x,
            top: tip.y - 6,
            transform: `translate(${tip.ancla}, -100%)`,
            background: "var(--foreground)",
            color: "var(--background)",
          }}
        >
          {tip.texto}
        </div>
      )}
    </div>
  );
}
