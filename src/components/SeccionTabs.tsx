"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Pestañas entre páginas hermanas de una misma sección del menú: Ligas y
 * Temporada (mismos puntos), Comunidad y Sesiones. Antes Temporada y Sesiones
 * estaban sueltas en "Más", lejos de aquello con lo que van.
 */
const SECCIONES = {
  ligas: [
    { labelKey: "ligas", href: "/ligas", match: (p: string) => p.startsWith("/ligas") },
    { labelKey: "temporada", href: "/temporada", match: (p: string) => p.startsWith("/temporada") },
  ],
  comunidad: [
    { labelKey: "actividad", href: "/feed", match: (p: string) => p.startsWith("/feed") },
    { labelKey: "sesiones", href: "/sesiones", match: (p: string) => p.startsWith("/sesiones") },
    { labelKey: "clanes", href: "/clanes", match: (p: string) => p.startsWith("/clanes") },
  ],
} as const;

export function SeccionTabs({ seccion }: { seccion: keyof typeof SECCIONES }) {
  const pathname = usePathname();
  const t = useTranslations("Shell.Header");
  return (
    // `overflow-x-auto` también recorta en vertical: el relleno deja sitio al
    // brillo y al `-translate-y` del hover, y el margen negativo lo compensa.
    <nav className="-mx-3 -mt-2 mb-6 flex gap-1.5 overflow-x-auto border-b border-border px-3 pb-3 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {SECCIONES[seccion].map((item) => {
        const activa = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activa ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5 ${
              activa ? "text-[var(--accent-text)]" : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
            style={activa ? { background: "rgb(var(--accent-rgb) / 0.12)" } : undefined}
          >
            {t(`nav.${item.labelKey}`)}
          </Link>
        );
      })}
    </nav>
  );
}
