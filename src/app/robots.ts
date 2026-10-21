import type { MetadataRoute } from "next";
import { dominioPublico } from "@/lib/site";

/**
 * robots.txt. No existia ninguno: los buscadores no tenian ni permiso
 * explicito ni forma de encontrar el sitemap.
 *
 * Lo que se bloquea es lo que NO tiene sentido indexar, no lo que hay que
 * proteger (eso ya lo hace la sesion en el servidor): paginas que exigen
 * sesion y siempre redirigen a /entrar, la API, y el modo enfoque (que es
 * una pantalla de uso, no contenido). Los perfiles publicos, las fichas de
 * juego y las guias SI se indexan: son justo lo que puede traer a alguien.
 */
const BOTS_FUERA = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
  "FacebookBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "cohere-ai",
  "Diffbot",
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "DataForSeoBot",
  "PetalBot",
  "BLEXBot",
  "serpstatbot",
];

export default function robots(): MetadataRoute.Robots {
  const dominio = dominioPublico();

  return {
    rules: [
      // Rastreadores de IA y de SEO (22 oct 2026): no traen visitas y cada
      // página que piden es CPU del servidor (se pasó del cupo de Vercel).
      // Los que respetan robots.txt dejan de venir; Google y Bing siguen.
      { userAgent: BOTS_FUERA, disallow: "/" },
      {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/ajustes",
        "/amigos",
        "/avisos",
        "/bienvenida",
        "/comparar",
        "/descubrir/recomendaciones",
        "/enfoque",
        "/entrar",
        "/feed",
        "/movil",
        "/offline",
        "/planificador",
        // Redirige a /amigos (ver next.config.ts); no hay nada que indexar.
        "/rankings",
        "/ritmo",
        "/vincular",
      ],
      },
    ],
    sitemap: `${dominio}/sitemap.xml`,
  };
}
