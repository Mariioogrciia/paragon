"use client";

import { useState } from "react";

/**
 * Botón "Compartir imagen" del Wrap.
 *
 * Antes era un `<a href="/api/wrap/[handle]" download="...">` a pelo. Eso
 * funciona en escritorio y en Android, pero Safari en iPhone/iPad **ignora
 * el atributo `download`** de un enlace — no es un fallo de la app, es una
 * limitación conocida de WebKit desde siempre: en vez de descargar, abre la
 * imagen a pantalla completa y ya, sin ofrecer guardarla. Es la causa real
 * de "desde el móvil no deja descargar nada" en iPhone.
 *
 * La solución de verdad en iOS es la Web Share API con `files`: abre la
 * hoja de compartir nativa, que sí trae "Guardar imagen" (y enviarla por
 * Mensajes, WhatsApp, etc. — más útil que un simple archivo en Descargas
 * para algo pensado para compartir). Donde no está disponible (la mayoría
 * de navegadores de escritorio), se cae a la descarga clásica vía blob.
 */
export function CompartirImagenWrap({ handle }: { handle: string }) {
  const [cargando, setCargando] = useState(false);

  async function compartir() {
    setCargando(true);
    try {
      const res = await fetch(`/api/wrap/${handle}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const file = new File([blob], `paragon-wrap-${handle}.png`, { type: "image/png" });

      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Mi Paragon Wrap" });
        } catch {
          // El usuario cancelando la hoja de compartir también rechaza la
          // promesa (AbortError) — no es un fallo real, no hay nada que avisar.
        }
        return;
      }

      // Descarga clásica (escritorio): sí respeta `download` porque el
      // recurso ya es un blob local, no una petición de red.
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `paragon-wrap-${handle}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } finally {
      setCargando(false);
    }
  }

  return (
    <button
      onClick={compartir}
      disabled={cargando}
      className="ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline disabled:opacity-50"
    >
      {cargando ? "Preparando…" : "Compartir imagen"}
    </button>
  );
}
