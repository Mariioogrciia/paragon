import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales } from "@/i18n/idiomas";

/**
 * Páginas públicas desde la CDN (21 oct 2026). Quien llega SIN sesión a la
 * portada, a una ficha de juego, a un perfil o (desde el 23 oct) a
 * Descubrir, Noticias o eSports recibe la copia ya hecha de
 * `app/(publico)/p/<idioma>/…`, que Next genera una vez y Vercel guarda (ver
 * su layout). Con sesión, la de siempre, renderizada para esa persona. La URL
 * del navegador no cambia: es una reescritura, no una redirección.
 *
 * Por qué: el plan Hobby se pasó de CPU (5 h 24 min de 4 h) y casi todo ese
 * tráfico son buscadores y visitas sin cuenta que veían exactamente lo mismo,
 * renderizado de cero cada vez.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // La copia interna no se enlaza nunca: si alguien llega a ella, a la URL buena.
  const interna = /^\/p\/[^/]+(\/.*)?$/.exec(pathname);
  if (interna) {
    const url = request.nextUrl.clone();
    url.pathname = interna[1] ?? "/";
    return NextResponse.redirect(url, 308);
  }

  if (request.method !== "GET" && request.method !== "HEAD") return;
  // Auth.js: `authjs.session-token` (o `__Secure-…` en https, a trozos `.0`, `.1` si crece).
  const conSesion = request.cookies.getAll().some((c) => /^(__Secure-)?authjs\.session-token/.test(c.name));
  if (conSesion) return;

  const elegido = request.cookies.get("NEXT_LOCALE")?.value;
  const idioma = elegido && locales.includes(elegido) ? elegido : defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/p/${idioma}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/", "/juego/:id", "/u/:handle", "/descubrir", "/noticias", "/esports", "/p/:path*"],
};
