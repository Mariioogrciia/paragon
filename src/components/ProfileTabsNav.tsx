"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

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
  esMio = false,
}: {
  handle: string;
  /** Contador junto a "Biblioteca", como el que tenían las pestañas. */
  juegos?: number;
  /** En tu propio perfil sale también "Ritmo" (/ritmo, solo tuyo), que antes no estaba en ningún menú. */
  esMio?: boolean;
}) {
  const pathname = usePathname();
  const base = `/u/${handle}`;
  // Difuminado a la derecha solo mientras queden pestañas fuera de la vista
  // (en móvil "Ritmo" quedaba cortada sin ninguna pista de que se desliza).
  const barra = useRef<HTMLDivElement>(null);
  const [hayMas, setHayMas] = useState(false);
  const medir = useCallback(() => {
    const el = barra.current;
    if (el) setHayMas(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);
  useEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [medir]);
  const t = useTranslations("Perfil");

  const pestanas = [
    { label: t("ProfileTabsNav.resumen"), href: base },
    { label: t("ProfileTabsNav.biblioteca"), href: `${base}/biblioteca`, badge: juegos },
    { label: t("ProfileTabsNav.estadisticas"), href: `${base}/estadisticas` },
    ...(esMio ? [{ label: t("ProfileTabsNav.ritmo"), href: "/ritmo" }] : []),
  ];

  return (
    // Una sola fila con scroll horizontal en vez de `flex-wrap`: en móvil
    // "Estadísticas" saltaba sola a una segunda línea. El `pt-1` deja sitio
    // al `-translate-y` del hover, que el overflow recortaría si no.
    <div ref={barra} onScroll={medir} role="tablist" className={`-mx-4 -mt-4 mb-7 flex gap-1.5 overflow-x-auto border-b border-border px-4 pb-4 pt-4 [scrollbar-width:none] sm:gap-2 [&::-webkit-scrollbar]:hidden${hayMas ? " [mask-image:linear-gradient(to_right,black_80%,transparent)]" : ""}`}>
      {pestanas.map((p) => {
        const activa = pathname === p.href;
        return (
          <Link
            key={p.href}
            href={p.href}
            role="tab"
            aria-selected={activa}
            aria-current={activa ? "page" : undefined}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold uppercase transition-all duration-200 hover:-translate-y-0.5 sm:px-4 sm:text-[0.8125rem] sm:tracking-wide"
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
