/**
 * Escudos de equipos y fotos de jugadores de PandaScore servidos desde
 * nuestro dominio. Avast tiene `cdn-api.pandascore.co` en su lista negra
 * (URL:Blacklist, 7 oct 2026) y saltaba una alerta por cada imagen de
 * /esports; así el navegador nunca contacta con ese dominio.
 *
 * Solo ese host (no es un proxy abierto) y solo imágenes. Caché larga en la
 * CDN de Vercel: la función solo corre la primera vez que se pide cada una.
 */
const HOST = "cdn-api.pandascore.co";
const MAX_BYTES = 5 * 1024 * 1024;

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u");
  let url: URL;
  try {
    url = new URL(u ?? "");
  } catch {
    return new Response(null, { status: 400 });
  }
  if (url.protocol !== "https:" || url.hostname !== HOST) return new Response(null, { status: 400 });

  // En local, Avast también corta la descarga desde el propio servidor: se
  // pide a la ruta de producción, que la sirve desde vercel.app.
  const origen =
    process.env.NODE_ENV === "development"
      ? `https://platinos-nine.vercel.app/api/esports/img?u=${encodeURIComponent(url.toString())}`
      : url;

  try {
    const res = await fetch(origen, { signal: AbortSignal.timeout(8_000), cache: "no-store" });
    const tipo = res.headers.get("content-type") ?? "";
    const largo = Number(res.headers.get("content-length") ?? 0);
    if (!res.ok || !res.body || !tipo.startsWith("image/") || largo > MAX_BYTES) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } });
    }
    return new Response(res.body, {
      headers: {
        "Content-Type": tipo,
        "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
