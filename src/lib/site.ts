/**
 * Dominio publico del sitio, en absoluto.
 *
 * Lo pone Vercel sola en cada despliegue (`VERCEL_PROJECT_PRODUCTION_URL`,
 * sin protocolo). En local se cae a `localhost:3000`, que es donde corre
 * `next dev`. No se guarda ningun dominio fijo en el repo a proposito:
 * adivinarlo mal romperia en silencio justo las cosas que dependen de una
 * URL absoluta de verdad (tarjetas sociales, sitemap, robots).
 *
 * Vive aqui y no en `lib/design.ts` porque lo usan tanto el layout raiz como
 * `sitemap.ts` y `robots.ts`, que no tienen nada que ver con diseno.
 */
export function dominioPublico(): string {
  return process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";
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
