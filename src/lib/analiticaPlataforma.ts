import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { asegurarTablas } from "@/lib/trafico";

/**
 * Admin → Analítica, parte de "usuarios y plataforma" (22 oct 2026): lo que
 * sale de los datos que Paragon ya tiene, sin contar nada nuevo. Embudo de
 * activación, retención por semanas de alta, con qué se registra la gente,
 * qué plataformas vincula, avisos activados, juegos con más jugadores,
 * trofeos del periodo por plataforma y el tamaño de la comunidad.
 */

const ZONA = "Europe/Madrid";
const HOY = sql.raw(`(now() at time zone '${ZONA}')::date`);
const numero = (v: unknown) => Number(v ?? 0);

export interface Cohorte {
  /** Lunes de la semana de alta (AAAA-MM-DD). */
  semana: string;
  altas: number;
  /** % de esas altas con actividad (web o app) en la semana 0, 1, 2... desde el alta. */
  retencion: (number | null)[];
}

export interface DatosPlataforma {
  embudo: { registrados: number; conPerfil: number; conPlataforma: number; sincronizados: number; conLogros: number; conPlatino: number };
  proveedores: { valor: string; n: number }[];
  plataformas: { valor: string; n: number }[];
  multiplataforma: { valor: string; n: number }[];
  avisos: { webPush: number; app: number; usuarios: number };
  trofeosPeriodo: { valor: string; n: number }[];
  syncsPeriodo: { valor: string; n: number }[];
  topJuegos: { titulo: string; plataforma: string; jugadores: number }[];
  cohortes: Cohorte[];
  comunidad: Record<string, number>;
  catalogo: { juegos: number; trofeos: number; ganados: number };
}

const SEMANAS = 8;

export async function datosPlataforma(dias: number): Promise<DatosPlataforma> {
  // La retención lee actividad_app, que crea lib/trafico.ts.
  await asegurarTablas();
  const desde = sql`${HOY} - ${dias - 1}::int`;
  const fechaMadrid = (col: string) => sql.raw(`("${col}" at time zone 'UTC' at time zone '${ZONA}')::date`);

  const [
    [embudo],
    proveedores,
    plataformas,
    multi,
    [avisos],
    trofeos,
    syncs,
    topJuegos,
    altasCohorte,
    actividadCohorte,
    [comunidad],
    [catalogo],
  ] = await Promise.all([
    db.execute<Record<string, number>>(sql`
      SELECT
        (SELECT count(*)::int FROM "user") AS "registrados",
        (SELECT count(*)::int FROM "user" WHERE "handle" IS NOT NULL) AS "conPerfil",
        (SELECT count(DISTINCT "userId")::int FROM "platform_account") AS "conPlataforma",
        (SELECT count(DISTINCT "userId")::int FROM "platform_account" WHERE "syncedAt" IS NOT NULL) AS "sincronizados",
        (SELECT count(DISTINCT "userId")::int FROM "user_game" WHERE "earnedTotal" > 0) AS "conLogros",
        (SELECT count(DISTINCT "userId")::int FROM "user_game"
           WHERE coalesce(("earned"->>'platinum')::int, 0) > 0 OR "progressPercent" = 100) AS "conPlatino"`),
    db.execute<{ valor: string; n: number }>(sql`
      SELECT "provider" AS "valor", count(DISTINCT "userId")::int AS "n" FROM "account" GROUP BY 1 ORDER BY 2 DESC`),
    db.execute<{ valor: string; n: number }>(sql`
      SELECT "platform" AS "valor", count(*)::int AS "n" FROM "platform_account" GROUP BY 1 ORDER BY 2 DESC`),
    db.execute<{ valor: string; n: number }>(sql`
      SELECT "cuantas"::text AS "valor", count(*)::int AS "n"
      FROM (SELECT "userId", count(*) AS "cuantas" FROM "platform_account" GROUP BY 1) t GROUP BY 1 ORDER BY 1`),
    db.execute<{ webPush: number; app: number; usuarios: number }>(sql`
      SELECT
        (SELECT count(DISTINCT "userId")::int FROM "push_subscription") AS "webPush",
        (SELECT count(DISTINCT "userId")::int FROM "fcm_token") AS "app",
        (SELECT count(*)::int FROM (SELECT "userId" FROM "push_subscription" UNION SELECT "userId" FROM "fcm_token") u) AS "usuarios"`),
    db.execute<{ valor: string; n: number }>(sql`
      SELECT g."platform" AS "valor", count(*)::int AS "n"
      FROM "user_trophy" ut JOIN "game" g ON g."id" = ut."gameId"
      WHERE ut."earned" AND ut."earnedAt" IS NOT NULL AND ${fechaMadrid("earnedAt")} >= ${desde}
      GROUP BY 1 ORDER BY 2 DESC`),
    db.execute<{ valor: string; n: number }>(sql`
      SELECT "platform" AS "valor", count(*)::int AS "n" FROM "sync_run"
      WHERE ${fechaMadrid("createdAt")} >= ${desde} GROUP BY 1 ORDER BY 2 DESC`),
    db.execute<{ titulo: string; plataforma: string; jugadores: number }>(sql`
      SELECT g."title" AS "titulo", g."platform" AS "plataforma", count(*)::int AS "jugadores"
      FROM "user_game" ug JOIN "game" g ON g."id" = ug."gameId"
      WHERE NOT ug."isWishlist" GROUP BY 1, 2 ORDER BY 3 DESC, 1 LIMIT 10`),
    db.execute<{ semana: string; altas: number }>(sql`
      SELECT date_trunc('week', ${fechaMadrid("createdAt")})::date::text AS "semana", count(*)::int AS "altas"
      FROM "user" WHERE ${fechaMadrid("createdAt")} > ${HOY} - ${SEMANAS * 7}::int GROUP BY 1`),
    db.execute<{ semana: string; desfase: number; activos: number }>(sql`
      WITH c AS (
        SELECT "id", date_trunc('week', ${fechaMadrid("createdAt")})::date AS "semana"
        FROM "user" WHERE ${fechaMadrid("createdAt")} > ${HOY} - ${SEMANAS * 7}::int
      ), a AS (
        SELECT "userId", date_trunc('week', "dia")::date AS "semana" FROM "actividad_usuario"
        UNION SELECT "userId", date_trunc('week', "dia")::date FROM "actividad_app"
      )
      SELECT c."semana"::text AS "semana", ((a."semana" - c."semana") / 7)::int AS "desfase", count(DISTINCT c."id")::int AS "activos"
      FROM c JOIN a ON a."userId" = c."id" AND a."semana" >= c."semana"
      GROUP BY 1, 2`),
    db.execute<Record<string, number>>(sql`
      SELECT
        (SELECT count(*)::int FROM "friendship" WHERE "status" = 'accepted') AS "amistades",
        (SELECT count(*)::int FROM "clans") AS "clanes",
        (SELECT count(*)::int FROM "league") AS "ligas",
        (SELECT count(*)::int FROM "game_guide") AS "guias",
        (SELECT count(*)::int FROM "collection") AS "colecciones",
        (SELECT count(*)::int FROM "activity_comment") AS "comentarios",
        (SELECT count(*)::int FROM "activity_reaction") AS "reacciones",
        (SELECT count(*)::int FROM "boost_session") AS "sesiones"`),
    db.execute<{ juegos: number; trofeos: number; ganados: number }>(sql`
      SELECT
        (SELECT count(*)::int FROM "game") AS "juegos",
        (SELECT count(*)::int FROM "game_trophy") AS "trofeos",
        (SELECT count(*)::int FROM "user_trophy" WHERE "earned") AS "ganados"`),
  ]);

  // Las semanas de alta, de la más reciente a la más antigua, con su retención.
  const activos = new Map([...actividadCohorte].map((a) => [`${a.semana}|${a.desfase}`, numero(a.activos)]));
  const lunesHoy = (() => {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: ZONA }));
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  })();
  const cohortes: Cohorte[] = [...altasCohorte]
    .map((c) => {
      const lunes = new Date(`${c.semana}T12:00:00`);
      const semanasDesde = Math.round((lunesHoy.getTime() - lunes.getTime()) / (7 * 864e5));
      return {
        semana: c.semana,
        altas: numero(c.altas),
        retencion: Array.from({ length: SEMANAS }, (_, i) =>
          i > semanasDesde ? null : Math.round(((activos.get(`${c.semana}|${i}`) ?? 0) / Math.max(1, numero(c.altas))) * 100),
        ),
      };
    })
    .sort((a, b) => b.semana.localeCompare(a.semana));

  const lista = (filas: Iterable<{ valor: string; n: number }>) => [...filas].map((f) => ({ valor: f.valor, n: numero(f.n) }));
  return {
    embudo: {
      registrados: numero(embudo?.registrados),
      conPerfil: numero(embudo?.conPerfil),
      conPlataforma: numero(embudo?.conPlataforma),
      sincronizados: numero(embudo?.sincronizados),
      conLogros: numero(embudo?.conLogros),
      conPlatino: numero(embudo?.conPlatino),
    },
    proveedores: lista(proveedores),
    plataformas: lista(plataformas),
    multiplataforma: lista(multi),
    avisos: { webPush: numero(avisos?.webPush), app: numero(avisos?.app), usuarios: numero(avisos?.usuarios) },
    trofeosPeriodo: lista(trofeos),
    syncsPeriodo: lista(syncs),
    topJuegos: [...topJuegos].map((j) => ({ titulo: j.titulo, plataforma: j.plataforma, jugadores: numero(j.jugadores) })),
    cohortes,
    comunidad: Object.fromEntries(Object.entries(comunidad ?? {}).map(([k, v]) => [k, numero(v)])),
    catalogo: { juegos: numero(catalogo?.juegos), trofeos: numero(catalogo?.trofeos), ganados: numero(catalogo?.ganados) },
  };
}
