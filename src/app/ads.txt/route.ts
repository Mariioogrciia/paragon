import { clienteAdSense, lineaAdsTxt } from "@/lib/publicidad";

/**
 * /ads.txt (19 oct 2026): dice qué redes pueden vender anuncios en Paragon.
 * AdSense lo pide en la raíz del dominio. Solo existe con
 * `NEXT_PUBLIC_ADSENSE_CLIENT` puesta (lib/publicidad.ts); sin ella, 404.
 */
export function GET() {
  const cliente = clienteAdSense();
  if (!cliente) return new Response("Not found", { status: 404 });
  return new Response(lineaAdsTxt(cliente), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
