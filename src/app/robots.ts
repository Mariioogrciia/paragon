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
export default function robots(): MetadataRoute.Robots {
  const dominio = dominioPublico();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/ajustes",
        "/avisos",
        "/bienvenida",
        "/comparar",
        "/entrar",
        "/offline",
        "/planificador",
        // Redirige a /amigos (ver next.config.ts); no hay nada que indexar.
        "/rankings",
        "/ritmo",
      ],
    },
    sitemap: `${dominio}/sitemap.xml`,
  };
}
