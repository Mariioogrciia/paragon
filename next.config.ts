import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // `got-scraping` (lib/epic/client.ts) lee sus datos de huella de navegador
  // (headers-order.json y similares) del disco con una ruta relativa a su
  // propio `node_modules` en tiempo de ejecución. Si Next lo empaqueta con
  // el resto del bundle (lo de siempre), esa ruta deja de existir y revienta
  // con ENOENT — comprobado a mano el 22 de septiembre de 2026. Con esto se
  // deja fuera del bundle y se resuelve tal cual desde `node_modules`.
  serverExternalPackages: ["got-scraping"],
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
