import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Versión del Service Worker (`/sw.js?v=`, ver ServiceWorkerRegister.tsx):
  // un valor por despliegue para que se reinstale y renueve la copia offline.
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "dev",
  },
  // Dominios conocidos de carátulas/capturas externas para poder usar
  // next/image en vez de <img> a pelo (auditoría de rendimiento, 22 sept
  // 2026): IGDB y Steam están fijos en nuestro propio código, así que se
  // pueden declarar con seguridad. Xbox/PSN NO están aquí a propósito: sus
  // URLs de imagen (avatar, carátula) llegan dinámicas dentro de la
  // respuesta de `xbl.io` y de `psn-api`, no están fijadas por nosotros, y
  // next/image da un error duro (no solo una imagen rota) contra cualquier
  // host que no esté en esta lista — añadirlos a ciegas sin poder probarlos
  // contra una cuenta real hoy habría podido tumbar las carátulas de Xbox y
  // PSN en vez de solo optimizarlas. Antes de migrar esos componentes,
  // confirmar el/los hostname(s) reales contra una cuenta viva y añadirlos
  // aquí.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.igdb.com" },
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "shared.akamai.steamstatic.com" },
    ],
  },
  // `sharp` (libvips nativo, unos 15 MB en Linux) no lo usa ya nuestro
  // código — `lib/coverAura.ts` decodifica con jpeg-js/pngjs —, pero sigue
  // instalado como dependencia opcional de Next y el trazado lo metía en
  // TODAS las funciones. En Vercel el optimizador de `/_next/image` corre en
  // su propia infraestructura, no dentro de nuestras funciones, así que
  // aquí no hace falta. Motivo: Functions Storage del plan Hobby al 90%
  // (9 GB / 10 GB, 25 sept 2026) — son MB × cada despliegue conservado.
  // Ojo: `next start` en local sí lo necesita para `/_next/image` (lo
  // encuentra en node_modules igual; esto solo afecta a lo que se sube).
  outputFileTracingExcludes: {
    "/**": ["node_modules/sharp/**", "node_modules/@img/**"],
  },
  // Cabeceras de seguridad (auditoría del 25 sept 2026): hasta ahora solo
  // salía el HSTS que pone Vercel. Sin `frame-ancestors`/X-Frame-Options,
  // cualquier web podía meter Paragon en un iframe invisible y hacer que
  // alguien con sesión pulsara botones sin saberlo (clickjacking). No hay
  // CSP completa a propósito: con scripts inline de Next, YouTube, Vercel
  // Analytics y carátulas de media docena de CDNs, una CSP estricta sin
  // poder probarla contra todo eso rompería más de lo que protege.
  // Permissions-Policy no toca `screen-wake-lock` (lo usa el Modo Enfoque).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        // `/rankings` se elimino: era una copia de lo que `/amigos` ya
        // enseñaba (las tablas "Esta semana"/"Este mes" salian de la MISMA
        // `getPeriodRankings`, y su ranking general por XP es la misma
        // Clasificacion).
        //
        // Va aqui y no con `redirect()` en una pagina a proposito: desde una
        // pagina, Next resuelve el salto con un `<meta http-equiv="refresh">`
        // de 1 segundo (comprobado en el HTML servido), que es peor
        // experiencia y peor para los buscadores. Desde la configuracion es
        // un 308 de verdad, resuelto antes de renderizar nada.
        source: "/rankings",
        destination: "/amigos",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
