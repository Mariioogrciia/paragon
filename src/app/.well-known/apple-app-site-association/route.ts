import { appleAppSiteAssociation } from "@/lib/enlacesApp";

/**
 * Universal Links de iOS: qué app puede abrir los enlaces de este dominio.
 * Apple lo pide sin extensión y como JSON. Sin `APPLE_TEAM_ID` en Vercel
 * (cuenta de pago de Apple) da 404, que es lo correcto. Ver lib/enlacesApp.ts.
 */
export function GET() {
  const datos = appleAppSiteAssociation(process.env.APPLE_TEAM_ID);
  if (!datos) return new Response("Sin Universal Links todavía.", { status: 404 });
  return Response.json(datos, { headers: { "Cache-Control": "public, max-age=3600" } });
}
