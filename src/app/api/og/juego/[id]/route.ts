import { imagenJuego } from "@/lib/og/imagenJuego";

/**
 * Tarjeta social de una ficha de juego, en una dirección fija (21 oct 2026).
 * Antes era `juego/[id]/opengraph-image.tsx`, pero desde que la ficha tiene
 * dos versiones (con sesión y la pública cacheada de `app/(publico)`) Next le
 * ponía un sufijo distinto a la ruta y la copia pública no podía enlazarla.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const imagen = await imagenJuego((await params).id);
  // Generarla es lo más caro en CPU de la web: que la sirva la CDN un día.
  imagen.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
  return imagen;
}
