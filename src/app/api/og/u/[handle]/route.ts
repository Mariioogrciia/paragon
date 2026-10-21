import { imagenPerfil } from "@/lib/og/imagenPerfil";

/**
 * Tarjeta social de un perfil, en una dirección fija (21 oct 2026). Antes era
 * `u/[handle]/opengraph-image.tsx`: ver `api/og/juego/[id]/route.ts`.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const imagen = await imagenPerfil((await params).handle);
  // Generarla es lo más caro en CPU de la web: que la sirva la CDN un día.
  imagen.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
  return imagen;
}
