import { NextResponse } from "next/server";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { games, platformAccounts, syncRuns, userGames, userTrophies } from "@/db/schema";
import { resyncLibraries } from "@/lib/profiles";
import { syncGameTrophies } from "@/lib/sync";
import { getGame, pegiPorTitulo } from "@/lib/igdb/client";
import { HORAS_CADUCIDAD } from "@/lib/syncHealth";

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

/**
 * Presupuesto real de tiempo, en ms — no los 60s de `maxDuration` de arriba.
 *
 * Hallazgo real del 17 de septiembre de 2026: el cron de verdad
 * (cron-job.org, cada 15 min) tiene su PROPIO timeout de cliente, fijo en
 * 30s en el plan gratis (no se puede subir, Vercel sí aguantaría 60s). Con
 * los topes de abajo en sus valores antiguos, una pasada normal tardaba
 * 22-44s — por encima de esos 30s casi siempre, así que cron-job.org
 * cortaba la conexión y marcaba "Fallido (timeout)" aunque Vercel SÍ
 * terminara bien del todo unos segundos después (confirmado con los logs
 * reales de Vercel: 200 en 36.9s). El resultado real era el mismo que si de
 * verdad hubiera fallado: cron-job.org nunca ve el 200, así que desde fuera
 * parece que el cron "no avanza", aunque el código en sí no tuviera ningún
 * bug. Con el presupuesto real puesto en 22s (dejando los 8s que faltan
 * hasta los 30s de cron-job.org de colchón para la ida y vuelta de la
 * petición en sí, DNS, TLS...) la función tiene que devolver su respuesta
 * bastante antes de que cron-job.org se rinda.
 */
const PRESUPUESTO_MS = 22_000;

/**
 * Cuántos USUARIOS se intentan como mucho en una pasada — es solo un tope,
 * no un objetivo: el bucle de abajo ya corta en cuanto se acaba
 * `PRESUPUESTO_MS`, así que subir esto no puede hacer que una pasada se
 * pase de tiempo, solo le da más margen para aprovecharlo si sobra.
 *
 * Subido de 2 a 4 el 21 de septiembre de 2026: con solo 8 usuarios reales
 * y `POR_PASADA=2`, la rotación completa tardaba 4 pasadas (~1h) en volver
 * a tocar la misma cuenta — quien ganaba un trofeo lo veía aparecer en
 * Paragon hasta una hora después, no en los 15 min que parece prometer el
 * cron. Con 4, la rotación baja a ~30 min. Si la base de usuarios crece
 * mucho, esto habrá que revisarlo otra vez (más usuarios reales = cada uno
 * vuelve a esperar más, haga lo que haga este número).
 */
const POR_PASADA = 4;

/**
 * Cuántas fichas de juego se rellenan por pasada.
 *
 * La biblioteca guarda el total de trofeos de cada juego, pero la fecha de
 * cada trofeo solo llega al pedir su detalle, y eso se hacía únicamente al
 * abrir la ficha. Resultado: el histórico solo conoce los juegos que alguien
 * ha abierto alguna vez. Rellenando unos cuantos por pasada, el histórico se
 * completa solo con el tiempo en vez de depender de que el usuario navegue.
 *
 * Bajado de 15 a 6 el 17 de septiembre de 2026, mismo motivo que
 * `PRESUPUESTO_MS` de arriba.
 */
const DETALLES_POR_PASADA = 6;

/**
 * Tope aparte para Xbox dentro de esa misma tanda: OpenXBL (xbl.io) va en un
 * nivel gratis de 150 peticiones/hora COMPARTIDO entre todos los usuarios
 * con Xbox vinculado, no por cuenta — ver el aviso de riesgo en
 * lib/xbl/client.ts. Sin este tope, una pasada con muchas fichas de Xbox sin
 * detalle podría agotar el cupo de la hora entera para todo el mundo.
 */
const XBL_DETALLES_POR_PASADA = 3;

/**
 * Cuántos juegos se intentan clasificar por pasada. Van todos en UNA consulta
 * a IGDB, así que el número puede ser generoso sin gastar cuota — pero
 * bajado de 60 a 30 el 17 de septiembre de 2026, mismo motivo que
 * `PRESUPUESTO_MS` de arriba: una respuesta más grande de IGDB también
 * tarda más en llegar, y ahora cada segundo cuenta el doble que antes.
 */
const PEGI_POR_PASADA = 30;

/**
 * Margen para cerrar. Si al terminar con una cuenta/ficha/lote queda menos
 * que esto, no se empieza otra: mejor dejarla para la pasada siguiente que
 * que la corten a medias y quede a saber cómo.
 *
 * Bajado de 25s a 8s el 17 de septiembre de 2026 junto con `PRESUPUESTO_MS`:
 * con un presupuesto total de 22s, un margen de 25s no dejaría currar nada
 * en absoluto (el primer chequeo ya fallaría). 8s de margen deja un tope de
 * arranque de ~14s para cada cuenta/ficha/lote — de sobra visto lo rápido
 * que responden PSN/Steam/Xbox en la práctica (0,3-1,5s por biblioteca).
 */
const MARGEN_MS = 8_000;

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
  // rancia. Los NULL (nunca sincronizados o nunca intentados) van primero.
  //
  // Se ordena por `lastAttemptedAt`, NO por `syncedAt` — bug real en
  // producción (18 sept 2026): `syncedAt` solo avanza en un ÉXITO
  // (a propósito, ver el comentario en schema.ts), así que una cuenta que
  // falla siempre (token caducado, cuenta puesta en privado...) se quedaba
  // siendo "la más rancia" para SIEMPRE — con `POR_PASADA` fijo en 2, esa
  // única cuenta rota ocupaba los dos huecos de cada pasada del cron para
  // siempre, dejando a TODO EL MUNDO detrás suyo sin sincronizar
  // indefinidamente (confirmado en vivo: 2h+ sin ninguna sincronización
  // real para nadie, con el cron respondiendo 200 OK cada 15 min sin hacer
  // nada útil). `lastAttemptedAt` sí avanza aunque falle, así que una
  // cuenta rota vuelve a intentarse de vez en cuando pero ya no bloquea a
  // las demás.
  const pendientes = await db
    .select({
      userId: platformAccounts.userId,
      masAntiguo: sql<Date | null>`min(${platformAccounts.lastAttemptedAt})`,
    })
    .from(platformAccounts)
    .groupBy(platformAccounts.userId)
    // El orden va entero en SQL crudo: envolverlo en asc() lo deja como
    // "nulls first asc", que Postgres rechaza.
    .orderBy(sql`min(${platformAccounts.lastAttemptedAt}) asc nulls first`)
    .limit(POR_PASADA);

  const resultados: { userId: string; juegos?: number; error?: string }[] = [];
  let agotado = false;

  for (const fila of pendientes) {
    if (Date.now() - arranque > PRESUPUESTO_MS - MARGEN_MS) {
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
    // ISO string, no un Date crudo — ver el mismo aviso en syncHealth.ts.
    const caducado = new Date(Date.now() - HORAS_CADUCIDAD * 60 * 60 * 1000).toISOString();

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
      // Nunca sincronizada, sincronizada pero incompleta (la biblioteca dice
      // que tienes más trofeos de los que hay guardados con detalle), o
      // sincronizada hace más de HORAS_CADUCIDAD — este último caso es el
      // que faltaba hasta el 15 de septiembre de 2026: esta consulta solo
      // arreglaba fichas rotas, nunca refrescaba una completa pero vieja.
      // Con eso, PSN se quedaba sin ninguna vía automática para limpiar su
      // "sin refrescar" (Ajustes → Plataformas): la sincronización de
      // cuenta (syncLibrary) no toca detalle de PSN, y esta era la única
      // fase que sí podía — solo que no miraba la edad, solo si faltaba.
      //
      // Los nombres de tabla y columna se interpolan desde el esquema, no a
      // mano: escritos a pelo salía "user_trophies"/"game_id" (plural y snake
      // case), que aquí no existen — las tablas son "user_trophy"/"user_game"
      // con columnas en camelCase entrecomilladas, y la consulta reventaba con
      // un 500 en cada pasada del cron.
      .where(
        sql`${userGames.trophiesSyncedAt} is null
          or ${userGames.trophiesSyncedAt} < ${caducado}
          or coalesce(${userGames.earnedTotal}, 0) > (
          select count(*) from ${userTrophies}
          where ${userTrophies.gameId} = ${userGames.gameId}
            and ${userTrophies.userId} = ${userGames.userId}
            and ${userTrophies.earned} = true
        )`,
      )
      // Bug real encontrado en vivo (18 sept 2026): esta cola es GLOBAL
      // (todos los usuarios a la vez) y ordenaba solo por antigüedad — con
      // DETALLES_POR_PASADA en 6 cada 15 min, un juego "solo viejo" (ya
      // tiene su detalle, hace más de HORAS_CADUCIDAD que no se refresca,
      // nada nuevo de verdad) le quitaba el turno a un juego con un
      // TROFEO REAL esperando (`earnedTotal` de la biblioteca por encima de
      // lo guardado — alguien lo jugó y consiguió algo, pero el detalle
      // todavía no lo sabe). El usuario lo notaba como "el cron no
      // funciona" hasta que abría la ficha del juego a mano, que sí fuerza
      // ese sync concreto (ver el `outOfSync` de `getGameDetail`). Ahora los
      // "fuera de sincronía" van SIEMPRE primero; entre ellos y entre el
      // resto, el más rancio primero.
      .orderBy(sql`
        (coalesce(${userGames.earnedTotal}, 0) > (
          select count(*) from ${userTrophies}
          where ${userTrophies.gameId} = ${userGames.gameId}
            and ${userTrophies.userId} = ${userGames.userId}
            and ${userTrophies.earned} = true
        )) desc,
        ${userGames.trophiesSyncedAt} asc nulls first
      `)
      .limit(DETALLES_POR_PASADA);

    let xboxDetalles = 0;

    for (const ficha of sinDetalle) {
      if (Date.now() - arranque > PRESUPUESTO_MS - MARGEN_MS) {
        agotado = true;
        break;
      }

      try {
        // El join ya descarta "manual", que no tiene API detrás.
        if (ficha.platform === "manual") continue;

        if (ficha.platform === "xbox") {
          if (xboxDetalles >= XBL_DETALLES_POR_PASADA) continue;
          xboxDetalles++;
        }

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
          arranque + PRESUPUESTO_MS - MARGEN_MS,
        );

        // Antes esto era un UPDATE por juego (hasta 30 round-trips
        // secuenciales) dentro de un presupuesto ya recortado a propósito a
        // 22s por los timeouts reales de cron-job.org (ver el comentario
        // grande al principio de este archivo) — un único UPDATE con CASE
        // hace lo mismo en un solo viaje.
        const clasificadosAhora = sinPegi.filter((juego) => encontrados.has(juego.title));
        if (clasificadosAhora.length > 0) {
          await db.execute(sql`
            UPDATE ${games} SET pegi = CASE id
              ${sql.join(
                clasificadosAhora.map((juego) => sql`WHEN ${juego.id} THEN ${encontrados.get(juego.title)}`),
                sql` `,
              )}
            END
            WHERE id IN (${sql.join(clasificadosAhora.map((juego) => sql`${juego.id}`), sql`, `)})
          `);
          clasificados += clasificadosAhora.length;
        }
      }
    } catch (error) {
      // Que IGDB falle no puede tumbar la sincronización, que es lo importante.
      console.error("[cron-sync] pegi", error);
    }
  }

  // Limpieza de `sync_run`: solo alimenta el "Historial de sincronización"
  // de Ajustes → Plataformas, que ya limita a las 20 más recientes
  // (getSyncHistory) — nadie mira más atrás de 30 días. Añadido el 15 de
  // septiembre de 2026: con el cron corriendo cada 15 min de verdad (antes
  // 1 vez al día), la tabla pasó de 4-40 filas/día a ~800/día — sin límite,
  // crecería para siempre. Un DELETE barato (unos pocos miles de filas hoy),
  // corre siempre, incluso si `agotado` — es independiente del resto y no
  // vale la pena dejarlo para la pasada siguiente.
  const RETENCION_SYNC_RUN_DIAS = 30;
  let borrados = 0;

  try {
    const limite = new Date(Date.now() - RETENCION_SYNC_RUN_DIAS * 24 * 60 * 60 * 1000);
    const eliminadas = await db.delete(syncRuns).where(lt(syncRuns.createdAt, limite)).returning({ id: syncRuns.id });
    borrados = eliminadas.length;
  } catch (error) {
    console.error("[cron-sync] limpieza sync_run", error);
  }

  return NextResponse.json({
    sincronizados: resultados.filter((r) => r.error === undefined).length,
    fallidos: resultados.filter((r) => r.error !== undefined).length,
    fichasRellenadas: detalles,
    clasificacionesPegi: clasificados,
    syncRunBorrados: borrados,
    pendientesPorTiempo: agotado,
    segundos: Math.round((Date.now() - arranque) / 1000),
    resultados,
  });
}
