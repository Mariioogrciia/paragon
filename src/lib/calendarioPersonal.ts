import "server-only";
import { and, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { gameGoals, games, userGames } from "@/db/schema";
import { fechasLanzamiento } from "@/lib/igdb/client";
import { listarSesiones } from "@/lib/sesiones";
import { listUserLeagues } from "@/lib/leagues";
import { idiomaDeUsuario } from "@/lib/idiomaUsuario";
import { dominioPublico } from "@/lib/site";
import { calendarioIcs, rellenar, TEXTOS_CALENDARIO, ultimoDiaDelMes, type EventoIcs } from "@/lib/ics";

/**
 * El calendario al que se suscribe cada persona (`/api/calendario/<token>`):
 * lanzamientos de su lista de deseados, sus sesiones (las que organiza y a
 * las que va), el cierre de sus ligas y de la liga mensual, y sus objetivos
 * con fecha del Planificador. Todo en su idioma.
 *
 * Cada fuente va por separado con `catch`: si IGDB no contesta, el
 * calendario sale sin lanzamientos en vez de dar error (un calendario
 * suscrito que falla se queda vacío hasta el siguiente refresco).
 */
export async function calendarioDe(userId: string): Promise<string> {
  const idioma = await idiomaDeUsuario(userId);
  const t = TEXTOS_CALENDARIO[idioma];
  const web = dominioPublico();
  const hace30 = new Date(Date.now() - 30 * 86_400_000);

  const [lanzamientos, sesiones, ligas, objetivos] = await Promise.all([
    eventosLanzamientos(userId, t.sale, web, hace30).catch(() => []),
    listarSesiones(userId, idioma)
      .then((lista) =>
        lista
          .filter((s) => !s.cancelada && (s.soyAnfitrion || s.estoyApuntado))
          .map<EventoIcs>((s) => ({
            uid: `sesion-${s.id}`,
            titulo: rellenar(t.sesion, { trofeo: s.trofeo, juego: s.juego.titulo }),
            descripcion: s.descripcion ?? undefined,
            url: `${web}/sesiones/${s.id}`,
            inicio: s.fechaHora,
          })),
      )
      .catch(() => []),
    listUserLeagues(userId)
      .then((lista) =>
        lista
          .filter((l) => l.endsAt && !l.terminada)
          .map<EventoIcs>((l) => ({
            uid: `liga-${l.id}`,
            titulo: rellenar(t.cierraLiga, { liga: l.name }),
            url: `${web}/ligas/${l.id}`,
            diaEntero: true,
            inicio: new Date(l.endsAt!),
          })),
      )
      .catch(() => []),
    db
      .select({ gameId: gameGoals.gameId, fecha: gameGoals.fechaObjetivo, titulo: games.title })
      .from(gameGoals)
      .innerJoin(games, eq(games.id, gameGoals.gameId))
      .where(and(eq(gameGoals.userId, userId), gte(gameGoals.fechaObjetivo, hace30.toISOString().slice(0, 10))))
      .then((filas) =>
        filas.map<EventoIcs>((f) => ({
          uid: `objetivo-${f.gameId}`,
          titulo: rellenar(t.objetivo, { juego: f.titulo }),
          url: `${web}/planificador`,
          diaEntero: true,
          inicio: new Date(`${f.fecha}T00:00:00Z`),
        })),
      )
      .catch(() => []),
  ]);

  // La liga mensual de todos cierra el último día de cada mes: este y el siguiente.
  const hoy = new Date();
  const mensuales = [0, 1].map<EventoIcs>((n) => {
    const mes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + n, 1));
    return {
      uid: `liga-mensual-${mes.toISOString().slice(0, 7)}`,
      titulo: t.cierraMensual,
      url: `${web}/ligas`,
      diaEntero: true,
      inicio: ultimoDiaDelMes(mes),
    };
  });

  return calendarioIcs(t.nombre, [...lanzamientos, ...sesiones, ...ligas, ...objetivos, ...mensuales]);
}

async function eventosLanzamientos(userId: string, plantilla: string, web: string, desde: Date): Promise<EventoIcs[]> {
  const deseados = await db
    .select({ gameId: games.id, igdbId: games.igdbId, titulo: games.title })
    .from(userGames)
    .innerJoin(games, eq(games.id, userGames.gameId))
    .where(and(eq(userGames.userId, userId), eq(userGames.isWishlist, true), isNotNull(games.igdbId)));
  if (deseados.length === 0) return [];
  const fechas = await fechasLanzamiento(deseados.map((d) => d.igdbId!));
  const eventos: EventoIcs[] = [];
  const vistos = new Set<number>();
  for (const d of deseados) {
    const fecha = fechas.get(d.igdbId!);
    // El mismo juego deseado en dos plataformas: un solo evento.
    if (!fecha || fecha < desde || vistos.has(d.igdbId!)) continue;
    vistos.add(d.igdbId!);
    eventos.push({
      uid: `lanzamiento-${d.igdbId}`,
      titulo: rellenar(plantilla, { juego: d.titulo }),
      url: `${web}/juego/${d.gameId}`,
      diaEntero: true,
      inicio: fecha,
    });
  }
  return eventos;
}
