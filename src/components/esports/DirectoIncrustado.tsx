"use client";

import { useState } from "react";

/**
 * Reproductor del directo. El documento ajeno pinta blanco mientras carga;
 * se queda invisible sobre el fondo negro hasta que termina, y entra fundido.
 */
export function DirectoIncrustado({ src, titulo }: { src: string; titulo: string }) {
  const [listo, setListo] = useState(false);
  return (
    <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-black">
      <iframe
        src={src}
        title={titulo}
        loading="lazy"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        onLoad={() => setListo(true)}
        style={{ colorScheme: "dark" }}
        className={`h-full w-full bg-black transition-opacity duration-500 motion-reduce:transition-none ${listo ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
