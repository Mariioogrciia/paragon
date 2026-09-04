"use client";

import { motion } from "framer-motion";

/**
 * Cifra destacada. No es un gráfico a propósito: un solo número se lee mejor
 * grande y desnudo que dentro de cualquier forma.
 */
export function StatTile({
  value,
  label,
  hint,
  accent,
}: {
  value: string | number;
  label: string;
  hint?: string;
  accent?: string;
}) {
  return (
    // El recorte del brillo (`animate-glint`, que trae su propio
    // `overflow: hidden`) va en el div interior, no en este — si viviera
    // aquí se comería en silencio el `hover:shadow` de abajo, la misma
    // trampa que ya pasó con `filter: drop-shadow` en DiscoverCard.tsx (ver
    // HANDOFF). El resplandor de hover necesita el borde de la caja libre.
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="h-full rounded-[20px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]"
    >
      {/* h-full en las dos capas: el grid ya estira esta caja a la altura de
          la fila (comportamiento por defecto), pero el borde/fondo vive en
          este div interior — sin `h-full` aquí se queda del alto de su
          propio contenido y no del hueco que el grid le da, así que una
          etiqueta larga de dos líneas ("Tasa de finalización") hacía esa
          tarjeta más alta que las demás en vez de igualarlas. */}
      <div className="animate-glint flex h-full flex-col justify-center rounded-[20px] border border-border bg-surface p-6">
        <p
          className="font-heading text-[40px] font-bold leading-none tabular-nums"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </p>
        <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
        {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
      </div>
    </motion.div>
  );
}
