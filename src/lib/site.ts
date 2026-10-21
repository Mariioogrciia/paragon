/**
 * El dominio de Paragon (21 oct 2026, comprado en Cloudflare). El principal
 * es el `www`: `paragontrophies.com` redirige a él (lo hace Vercel) y
 * `platinos-nine.vercel.app` también, salvo /api y /movil (next.config.ts),
 * para no romper las apps y la extensión ya instaladas.
 *
 * Fijo y no `VERCEL_PROJECT_PRODUCTION_URL`: Vercel pone ahí el dominio más
 * corto, que es el que redirige, y las URLs absolutas (tarjetas sociales,
 * sitemap, enlaces de los DM) tienen que ir al bueno. Si cambia, cambiarlo
 * aquí, en kmp (`URL_BASE`, `BASE_URL`) y en extension/.
 */
export const DOMINIO = "www.paragontrophies.com";

/**
 * Dominio publico del sitio, en absoluto. En local, `localhost:3000`, que es
 * donde corre `next dev`.
 *
 * Vive aqui y no en `lib/design.ts` porque lo usan tanto el layout raiz como
 * `sitemap.ts` y `robots.ts`, que no tienen nada que ver con diseno.
 */
export function dominioPublico(): string {
  return dominioProduccion() ? `https://${DOMINIO}` : "http://localhost:3000";
}

/** El dominio sin protocolo en Vercel (producción y previas); null en local. */
export function dominioProduccion(): string | null {
  return process.env.VERCEL ? DOMINIO : null;
}

/**
 * Los perfiles públicos de quien hace Paragon: los mismos enlaces que el pie
 * (components/Footer.tsx). Van en los datos estructurados del sitio
 * (lib/datosEstructurados.ts) para que los buscadores sepan quién está detrás.
 */
export const PERFILES_AUTOR = [
  "https://www.instagram.com/mariioogrciia/",
  "https://www.tiktok.com/@mariioogrciia",
  "https://github.com/Mariioogrciia",
  "https://www.linkedin.com/in/mario-garc%C3%ADa-romero-453348304",
];
