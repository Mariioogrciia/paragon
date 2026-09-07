import type { MetadataRoute } from "next";
import { isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { games, users } from "@/db/schema";
import { dominioPublico } from "@/lib/site";

/**
 * Sitemap. No existia ninguno, asi que ningun buscador sabia que existen las
 * 22 paginas publicas de Paragon (perfiles, fichas de juego, guias) — el
 * problema mas barato de arreglar de todos los que tiene una app con 6
 * usuarios y media docena de funciones sociales esperando gente.
 *
 * Se genera con datos de verdad, no con una lista escrita a mano que se
 * quedaria vieja: los perfiles salen de los `handle` que existen y los
 * juegos de los `igdbId` reales del catalogo.
 *
 * `revalidate` diario: esto son cientos de URLs y no cambian de minuto a
 * minuto; sin cache, cada visita de un rastreador dispararia las dos
 * consultas contra un pool de 5 conexiones.
 */
export const revalidate = 86_400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dominio = dominioPublico();
  const ahora = new Date();

  // Estaticas y publicas. Fuera todo lo que exige sesion (redirige a
  // /entrar, indexarlo es enviar al rastreador a una pantalla de login) y
  // las utilidades sin contenido (/offline, /entrar).
  const fijas: MetadataRoute.Sitemap = [
    { url: dominio, lastModified: ahora, changeFrequency: "daily", priority: 1 },
    { url: `${dominio}/descubrir`, lastModified: ahora, changeFrequency: "daily", priority: 0.8 },
    { url: `${dominio}/descubrir/playstation`, lastModified: ahora, changeFrequency: "daily", priority: 0.7 },
    { url: `${dominio}/descubrir/steam`, lastModified: ahora, changeFrequency: "daily", priority: 0.7 },
    { url: `${dominio}/descubrir/xbox`, lastModified: ahora, changeFrequency: "daily", priority: 0.6 },
    { url: `${dominio}/noticias`, lastModified: ahora, changeFrequency: "daily", priority: 0.7 },
    { url: `${dominio}/ligas`, lastModified: ahora, changeFrequency: "daily", priority: 0.6 },
    { url: `${dominio}/feed`, lastModified: ahora, changeFrequency: "hourly", priority: 0.5 },
    { url: `${dominio}/ejemplo`, lastModified: ahora, changeFrequency: "monthly", priority: 0.4 },
    { url: `${dominio}/privacidad`, lastModified: ahora, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const [perfiles, catalogo] = await Promise.all([
      db.select({ handle: users.handle }).from(users).where(isNotNull(users.handle)),
      db
        .selectDistinct({ igdbId: games.igdbId })
        .from(games)
        .where(isNotNull(games.igdbId))
        .limit(5_000),
    ]);

    const rutasPerfil: MetadataRoute.Sitemap = perfiles.flatMap(({ handle }) =>
      handle
        ? [
            { url: `${dominio}/u/${handle}`, lastModified: ahora, changeFrequency: "daily" as const, priority: 0.9 },
            { url: `${dominio}/u/${handle}/biblioteca`, lastModified: ahora, changeFrequency: "daily" as const, priority: 0.6 },
            { url: `${dominio}/u/${handle}/estadisticas`, lastModified: ahora, changeFrequency: "weekly" as const, priority: 0.5 },
          ]
        : [],
    );

    const rutasJuego: MetadataRoute.Sitemap = catalogo.flatMap(({ igdbId }) =>
      igdbId
        ? [{ url: `${dominio}/juego/${igdbId}`, lastModified: ahora, changeFrequency: "weekly" as const, priority: 0.6 }]
        : [],
    );

    return [...fijas, ...rutasPerfil, ...rutasJuego];
  } catch {
    // Si la base no responde, un sitemap con las rutas fijas es mejor que un
    // 500: el rastreador se queda con algo y vuelve mañana.
    return fijas;
  }
}
