import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Respuesta JSON con ETag para la app Android (auditoría, 4 oct 2026).
 *
 * La biblioteca entera, el panel o las estadísticas pesan bastante y casi
 * nunca cambian entre dos aperturas de la app. Con `ETag` + `Cache-Control:
 * private, no-cache`, OkHttp guarda la respuesta y en la siguiente petición
 * manda `If-None-Match`: si no ha cambiado, aquí se contesta `304` sin
 * cuerpo y el móvil reutiliza su copia (menos datos y menos batería). El
 * servidor sigue calculando la respuesta, pero no la manda.
 *
 * El ETag incluye a quién se le responde: el caché de OkHttp va por URL, y
 * dos cuentas en el mismo móvil nunca pueden compartir una respuesta.
 * `Vary` por lo mismo, y por el idioma (los trofeos cambian con él).
 */
export function jsonConEtag(req: Request, datos: unknown, quien: string): NextResponse {
  const cuerpo = JSON.stringify(datos);
  const etag = `W/"${createHash("sha1").update(quien).update("\u0000").update(cuerpo).digest("base64url")}"`;
  const cabeceras = {
    ETag: etag,
    "Cache-Control": "private, no-cache",
    Vary: "Authorization, Accept-Language",
  };

  const pedidas = req.headers.get("if-none-match");
  if (pedidas && pedidas.split(",").some((e) => e.trim() === etag)) {
    return new NextResponse(null, { status: 304, headers: cabeceras });
  }
  return new NextResponse(cuerpo, { status: 200, headers: { ...cabeceras, "Content-Type": "application/json" } });
}
