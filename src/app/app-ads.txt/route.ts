import { clienteAdSense, editorAdMob, lineasAppAdsTxt } from "@/lib/publicidad";

/**
 * /app-ads.txt (19 oct 2026): el ads.txt de las apps. AdMob lo busca en el
 * sitio web de la ficha de Google Play para dejar servir anuncios en la app
 * de Android. Sale con `ADMOB_APP_ID` (o, si no, el editor de AdSense);
 * sin ninguno, 404. Ver lib/publicidad.ts.
 */
export function GET() {
  const texto = lineasAppAdsTxt(editorAdMob(), clienteAdSense());
  if (!texto) return new Response("Not found", { status: 404 });
  return new Response(texto, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
