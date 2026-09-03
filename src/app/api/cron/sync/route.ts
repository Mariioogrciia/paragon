import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { games, platformAccounts, userGames, userTrophies } from "@/db/schema";
import { resyncLibraries } from "@/lib/profiles";
import { syncGameTrophies } from "@/lib/sync";
import { getGame, pegiPorTitulo } from "@/lib/igdb/client";
import { generarAvisos } from "@/lib/notifications";

/**
 * Sincronización desatendida.
 *
 * Hasta ahora los datos solo se refrescaban al vincular una cuenta o al pulsar
 * "Sincronizar ahora": quien no entraba, se quedaba con la biblioteca de la
 * última visita. Esto la mantiene al día sola y, sobre todo, es lo que hace
 * que el histórico (`lib/history.ts`) tenga sentido: sin pasadas regulares,
 * los trofeos aparecen todos de golpe el día que alguien abre la web.
 *
 * NO sincroniza a todo el mundo en cada pasada, a propósito: una cuenta con
 * PSN y Steam se lleva decenas de segundos (biblioteca entera + detalle de los
 * juegos recientes de Steam), así que la función se quedaría sin tiempo a la
 * tercera persona. Se cogen los más desactualizados y el resto entra en la
 * pasada siguiente.
 *
 * El plan Hobby de Vercel solo deja una ejecución diaria (no por hora, que es
 * lo que pedía este cron al principio y Vercel rechazó el despliegue), así
 * que la rotación entre usuarios es más lenta: cubre a todos en varios días
 * en vez de en un día. Los límites de abajo van generosos porque, aun así,
 * quien de verdad corta cada bloque es el chequeo de tiempo transcurrido, no
 * estos números.
 */

/** Segundos de la función. Vercel corta a 60 en el plan Hobby. */
export const maxDuration = 60;

/** Cuántas cuentas se intentan como mucho en una pasada. */
const POR_PASADA = 8;

/**
 * Cuántas fichas de juego se rellenan por pasada.
 *
 * La biblioteca guarda el total de trofeos de cada juego, pero la fecha de
 * cada trofeo solo llega al pedir su detalle, y eso se hacía únicamente al
 * abrir la ficha. Resultado: el histórico solo conoce los juegos que alguien
 * ha abierto alguna vez. Rellenando unos cuantos por pasada, el histórico se
 * completa solo con el tiempo en vez de depender de que el usuario navegue.
 */
const DETALLES_POR_PASADA = 40;

/**
 * Cuántos juegos se intentan clasificar por pasada. Van todos en UNA consulta
 * a IGDB, así que el número puede ser generoso sin gastar cuota.
 */
const PEGI_POR_PASADA = 150;

/**
 * Margen para cerrar. Si al terminar con una cuenta queda menos que esto, no
 * se empieza otra: mejor dejarla para la pasada siguiente que que la corten a
 * medias y quede a saber cómo.
 */
const MARGEN_MS = 15_000;

export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;

  // Vercel manda este cabecera solo si CRON_SECRET está definido. Sin secreto
  // configurado la ruta queda abierta a cualquiera, y sincronizar es caro:
  // mejor no arrancar que dejar un botón de gastar cuota a la vista.
  if (!secreto) {
    return NextResponse.json(
      { error: "Falta CRON_SECRET en el servidor." },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const arranque = Date.now();

  // Un usuario puede tener varias cuentas; `resyncLibraries` ya las recorre
  // todas, así que aquí interesa el usuario, ordenado por su cuenta más
  // rancia. Los NULL (nunca sincronizados) van primero.
  const pendientes = await db
    .select({
      userId: platformAccounts.userId,
      masAntiguo: sql<Date | null>`min(${platformAccounts.syncedAt})`,
    })
    .from(platformAccounts)
    .groupBy(platformAccounts.userId)
    // El orden va entero en SQL crudo: envolverlo en asc() lo deja como
    // "nulls first asc", que Postgres rechaza.
    .orderBy(sql`min(${platformAccounts.syncedAt}) asc nulls first`)
    .limit(POR_PASADA);

  const resultados: { userId: string; juegos?: number; error?: string }[] = [];
  let agotado = false;

  for (const fila of pendientes) {
    if (Date.now() - arranque > (maxDuration * 1000) - MARGEN_MS) {
      agotado = true;
      break;
    }

    try {
      const juegos = await resyncLibraries(fila.userId);
      resultados.push({ userId: fila.userId, juegos });
    } catch (error) {
      // Que una cuenta falle (perfil puesto en privado, PSN caída, token
      // caducado) no puede tumbar la pasada entera.
      console.error("[cron-sync]", fila.userId, error);
      resultados.push({
        userId: fila.userId,
        error: error instanceof Error ? error.message : "error desconocido",
      });
    }
  }

  // Con el tiempo que sobre, rellenar fichas sin detalle: es lo que da fechas
  // de trofeo al histórico. Van las de plataformas con cuenta legible, porque
  // las privadas fallarían una a una en cada pasada, para siempre.
  let detalles = 0;

  if (!agotado) {
    const sinDetalle = await db
      .select({
        userId: userGames.userId,
        gameId: userGames.gameId,
        platform: games.platform,
        accountId: platformAccounts.accountId,
      })
      .from(userGames)
      .innerJoin(games, eq(games.id, userGames.gameId))
      .innerJoin(
        platformAccounts,
        and(
          eq(platformAccounts.userId, userGames.userId),
          eq(platformAccounts.platform, games.platform),
          eq(platformAccounts.isPublic, true),
        ),
      )
      // Nunca sincronizada, o sincronizada pero incompleta: si la biblioteca
      // dice que tienes más trofeos de los que hay guardados con detalle, esa
      // ficha se ha quedado corta y toca repescarla.
      //
      // Los nombres de tabla y columna se interpolan desde el esquema, no a
      // mano: escritos a pelo salía "user_trophies"/"game_id" (plural y snake
      // case), que aquí no existen — las tablas son "user_trophy"/"user_game"
      // con columnas en camelCase entrecomilladas, y la consulta reventaba con
      // un 500 en cada pasada del cron.
      .where(
        sql`${userGames.trophiesSyncedAt} is null or coalesce(${userGames.earnedTotal}, 0) > (
          select count(*) from ${userTrophies}
          where ${userTrophies.gameId} = ${userGames.gameId}
            and ${userTrophies.userId} = ${userGames.userId}
            and ${userTrophies.earned} = true
        )`,
      )
      .limit(DETALLES_POR_PASADA);

    for (const ficha of sinDetalle) {
      if (Date.now() - arranque > maxDuration * 1000 - MARGEN_MS) {
        agotado = true;
        break;
      }

      try {
        // El join ya descarta "manual", que no tiene API detrás.
        if (ficha.platform === "manual") continue;

        await syncGameTrophies(
          ficha.userId,
          { platform: ficha.platform, accountId: ficha.accountId },
          ficha.gameId,
        );
        detalles++;
      } catch (error) {
        console.error("[cron-sync] detalle", ficha.gameId, error);
      }
    }
  }

  // Clasificación por edades. La única fuente que la tiene para todo el
  // catálogo es IGDB: Steam solo da `required_age`, que vale 0 en casi todos
  // los juegos, y PSN no la da en absoluto. Va en lote (una consulta por
  // tanda) porque son cientos de juegos y una llamada por cabeza se comería
  // el límite de IGDB.
  let clasificados = 0;

  if (!agotado) {
    try {
      const sinPegi = await db
        .select({ id: games.id, title: games.title })
        .from(games)
        .where(isNull(games.pegi))
        // Al azar: los juegos que IGDB no conoce se quedarían para siempre los
        // primeros de la cola y taparían al resto en cada pasada.
        .orderBy(sql`random()`)
        .limit(PEGI_POR_PASADA);

      if (sinPegi.length > 0) {
        // Se le pasa hasta cuándo puede buscar: el resto queda para la
        // pasada siguiente, que es mejor que morir a mitad.
        const encontrados = await pegiPorTitulo(
          sinPegi.map((g) => g.title),
          arranque + maxDuration * 1000 - MARGEN_MS,
        );

        for (const juego of sinPegi) {
          const pegi = encontrados.get(juego.title);
          if (!pegi) continue;

          await db.update(games).set({ pegi }).where(eq(games.id, juego.id));
          clasificados++;
        }
      }
    } catch (error) {
      // Que IGDB falle no puede tumbar la sincronización, que es lo importante.
      console.error("[cron-sync] pegi", error);
    }
  }

  // Avisos, con los datos ya frescos. Van al final a propósito: si la pasada
  // se queda sin tiempo antes, es preferible perder los avisos de esta hora
  // que dejar la biblioteca sin sincronizar.
  let avisos = 0;

  for (const fila of pendientes) {
    if (Date.now() - arranque > maxDuration * 1000 - 5_000) break;

    try {
      avisos += await generarAvisos(fila.userId, async (igdbId) => {
        const juego = await getGame(igdbId);
        return juego ? { titulo: juego.title, salida: juego.releaseDate } : null;
      });
    } catch (error) {
      console.error("[cron-sync] avisos", fila.userId, error);
    }
  }

  return NextResponse.json({
    avisosNuevos: avisos,
    sincronizados: resultados.filter((r) => r.error === undefined).length,
    fallidos: resultados.filter((r) => r.error !== undefined).length,
    fichasRellenadas: detalles,
    clasificacionesPegi: clasificados,
    pendientesPorTiempo: agotado,
    segundos: Math.round((Date.now() - arranque) / 1000),
    resultados,
  });
}
