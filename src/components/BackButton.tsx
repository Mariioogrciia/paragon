"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * "Volver" con el historial del navegador (`router.back()`), no con una
 * ruta fija — así vuelve de verdad a la pantalla concreta de donde se
 * vino (con los mismos filtros, el mismo scroll), no a un "sitio padre"
 * genérico que igual no es de donde saliste. `fallbackHref` es la red de
 * seguridad para cuando no hay historial de verdad que volver (se entró
 * por un enlace directo, una pestaña nueva, un marcador...) — sin él,
 * `back()` en esos casos se queda quieto o sale de la app.
 */
export function BackButton({
  fallbackHref,
  label = "Volver",
  dark = false,
  className = "",
}: {
  fallbackHref: string;
  label?: string;
  /** Para cuando va sobre una cabecera oscura con imagen de fondo — texto claro en vez de `text-muted`. */
  dark?: boolean;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        // `history.length <= 1` cuando esta pestaña no tiene nada antes que
        // esta página (llegada directa) — con más historial, puede seguir
        // sin ser "nuestro" (un enlace externo, otra pestaña abierta aquí a
        // propósito): por eso la red de seguridad se pone siempre igual,
        // aunque solo haga falta de verdad en el primer caso.
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      className={`mb-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
        dark ? "text-white/70 hover:text-white" : "text-muted hover:text-foreground"
      } ${className}`}
    >
      <ArrowLeft size={14} />
      {label}
    </button>
  );
}
