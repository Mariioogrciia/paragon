import type { Metadata } from "next";

/**
 * Metadatos de una página pública (21 oct 2026, con el dominio propio): el
 * título, la descripción que enseña Google y la URL canónica. La canónica
 * importa porque la misma página se puede abrir con parámetros (?ver=,
 * ?tab=...) o, hasta hace nada, desde platinos-nine.vercel.app: así Google
 * junta todo en una sola URL en vez de repartir la relevancia. Relativa:
 * Next la completa con `metadataBase` (el dominio de lib/site.ts).
 *
 * `openGraph` se repite entero porque Next no mezcla el de la página con el
 * del layout: lo sustituye.
 */
export function metaPublica(ruta: string, titulo: string, descripcion: string, extra: Metadata = {}): Metadata {
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: ruta },
    openGraph: { siteName: "Paragon", locale: "es_ES", type: "website", url: ruta, title: titulo, description: descripcion },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion },
    ...extra,
  };
}
