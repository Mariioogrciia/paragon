"use client";

import { useState } from "react";

/**
 * Botón "compartir imagen" genérico — la lógica que antes vivía solo en
 * `CompartirImagenWrap.tsx` (el Wrap del perfil), generalizada para
 * cualquier imagen generada por el servidor (la del Wrap, la de un
 * platino conseguido...).
 *
 * Antes esto era un `<a download="...">` a pelo. Eso funciona en escritorio
 * y en Android, pero Safari en iPhone/iPad **ignora el atributo `download`**
 * de un enlace — no es un fallo de la app, es una limitación conocida de
 * WebKit desde siempre: en vez de descargar, abre la imagen a pantalla
 * completa y ya, sin ofrecer guardarla.
 *
 * La solución de verdad en iOS es la Web Share API con `files`: abre la
 * hoja de compartir nativa, que sí trae "Guardar imagen" (y enviarla por
 * Mensajes, WhatsApp, etc.). Donde no está disponible (la mayoría de
 * navegadores de escritorio), se cae a la descarga clásica vía blob.
 */
export function CompartirImagen({
  url,
  nombreArchivo,
  tituloCompartir,
  className = "text-xs font-bold uppercase tracking-wide text-accent hover:underline disabled:opacity-50",
  style,
  children = "Compartir imagen",
}: {
  /** Endpoint que devuelve la imagen (un `ImageResponse` de next/og). */
  url: string;
  nombreArchivo: string;
  tituloCompartir: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const [cargando, setCargando] = useState(false);

  async function compartir() {
    setCargando(true);
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const blob = await res.blob();
      const file = new File([blob], nombreArchivo, { type: "image/png" });

      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: tituloCompartir });
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
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } finally {
      setCargando(false);
    }
  }

  return (
    <button onClick={compartir} disabled={cargando} className={className} style={style}>
      {cargando ? "Preparando…" : children}
    </button>
  );
}
