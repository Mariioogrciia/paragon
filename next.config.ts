import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

export default nextConfig;
