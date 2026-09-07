"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Pestañas del perfil, pero como ENLACES a rutas de verdad, no como
 * secciones ocultas con `hidden`.
 *
 * Antes esto lo hacía `SectionTabs` (que sigue existiendo y sigue valiendo
 * para el panel): renderizaba las tres pestañas enteras en el servidor y
 * solo escondía las que no tocaban. El problema medido: la pestaña
 * "Biblioteca" le pasa los juegos ENTEROS a `LibraryGrid`, que es un
 * componente de cliente — con 291 juegos, el perfil mandaba **1.030 KB** en
 * cada visita aunque la biblioteca ni se mirara (la pestaña por defecto es
 * "Resumen"). Con una ruta por pestaña, cada una carga solo lo suyo.
 *
 * Se mantiene el mismo aspecto que tenían las pestañas para que no cambie
 * la sensación de uso, y de regalo cada pestaña es ahora enlazable y
 * compartible (antes la pestaña activa vivía en `localStorage`, invisible
 * desde fuera).
 */
export function ProfileTabsNav({
  handle,
  juegos,
}: {
  handle: string;
  /** Contador junto a "Biblioteca", como el que tenían las pestañas. */
  juegos?: number;
}) {
  const pathname = usePathname();
  const base = `/u/${handle}`;

  const pestanas = [
    { label: "Resumen", href: base },
    { label: "Biblioteca", href: `${base}/biblioteca`, badge: juegos },
    { label: "Estadísticas", href: `${base}/estadisticas` },
  ];

  return (
    <div role="tablist" className="mb-7 flex flex-wrap gap-2 border-b border-border pb-4">
      {pestanas.map((p) => {
        const activa = pathname === p.href;
        return (
          <Link
            key={p.href}
            href={p.href}
            role="tab"
            aria-selected={activa}
            aria-current={activa ? "page" : undefined}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-[0.8125rem] font-bold uppercase tracking-wide transition-all duration-200 hover:-translate-y-0.5"
            style={
              activa
                ? {
                    background: "rgb(var(--accent-rgb) / 0.12)",
                    border: "1px solid rgb(var(--accent-rgb) / 0.3)",
                    color: "var(--accent-text)",
                  }
                : { background: "none", border: "1px solid transparent", color: "var(--muted)" }
            }
          >
            {p.label}
            {p.badge != null && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold"
                style={{ background: "var(--surface-2)", color: "var(--muted)" }}
              >
                {p.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
