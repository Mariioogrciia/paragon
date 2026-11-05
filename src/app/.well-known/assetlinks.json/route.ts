import { assetLinks, huellasAndroid } from "@/lib/enlacesApp";

/** Digital Asset Links de Android (App Links): qué app puede abrir los enlaces de este dominio. Ver lib/enlacesApp.ts. */
export function GET() {
  return Response.json(assetLinks(huellasAndroid(process.env.ANDROID_CERT_SHA256)), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
