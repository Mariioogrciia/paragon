"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/ajustes", label: "General" },
  { href: "/ajustes/apariencia", label: "Apariencia" },
  { href: "/ajustes/seguridad", label: "Inicio de sesión y seguridad" },
  { href: "/ajustes/plataformas", label: "Cuentas de Juegos" },
  { href: "/ajustes/ocultar", label: "Ocultar" },
];

/**
 * Extraído de `ajustes/layout.tsx` (que es un Server Component, por la
 * llamada a `auth()`) porque saber en qué sección estás requiere
 * `usePathname()`, que solo existe en cliente. Antes los 5 enlaces tenían
 * exactamente el mismo estilo siempre — sin marcar cuál era la sección
 * activa, la única pista de dónde estabas era el contenido de la derecha.
 *
 * `/ajustes` necesita comparación EXACTA, no `startsWith` como el resto:
 * es el prefijo de todas las demás rutas de este menú, así que con
 * `startsWith` se habría quedado marcado como "activo" en cualquier otra
 * sección.
 */
export function AjustesNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map((item) => {
        const activo = item.href === "/ajustes" ? pathname === item.href : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activo ? "page" : undefined}
            className={
              activo
                ? "flex items-center gap-3 rounded-lg border-l-2 px-4 py-3 text-sm font-medium text-foreground transition-colors"
                : "flex items-center gap-3 rounded-lg border-l-2 border-transparent px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground"
            }
            style={activo ? { background: "rgba(255, 255, 255, 0.1)", borderColor: "var(--accent)" } : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
