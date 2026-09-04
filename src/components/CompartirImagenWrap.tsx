"use client";

import { CompartirImagen } from "@/components/CompartirImagen";

/**
 * Botón "Compartir imagen" del Wrap — envoltorio fino sobre el componente
 * genérico (CompartirImagen.tsx, que también usa la tarjeta de platino).
 */
export function CompartirImagenWrap({ handle }: { handle: string }) {
  return (
    <CompartirImagen
      url={`/api/wrap/${handle}`}
      nombreArchivo={`paragon-wrap-${handle}.png`}
      tituloCompartir="Mi Paragon Wrap"
    />
  );
}
