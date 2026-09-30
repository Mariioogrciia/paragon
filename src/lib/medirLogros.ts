import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getParagonLevel } from "@/lib/paragonLevel";
import type { MedidasLogros } from "@/lib/logros";

/**
 * Todo lo que miden las insignias de lib/logros.ts, en UNA consulta (el pool
 * tiene 5 conexiones: una por métrica atascaría el perfil) más el nivel.
 *
 * Horas "locales" (noctámbulo, maratón) en la zona horaria de la persona; si
 * la guardada no la conoce Postgres, Madrid, en vez de reventar la consulta.
 */
/** `nivel`: si quien llama ya lo tiene (el perfil lo calcula con paragonProgress), no se vuelve a pedir. */
export async function medirLogros(userId: string, nivel?: number): Promise<MedidasLogros> {
  const [[fila], nivelCalculado] = await Promise.all([
    db.execute<Record<string, string | number | null>>(sql`
      with zona as (
        select case when u.timezone in (select name from pg_timezone_names) then u.timezone else 'Europe/Madrid' end as tz
        from "user" u where u.id = ${userId}
      ),
      mios as (
        select ug."gameId", ug.earned, ug."progressPercent", ug.review, g.platform, g.genres
        from user_game ug join game g on g.id = ug."gameId"
        where ug."userId" = ${userId} and not ug."isWishlist"
      ),
      trofeos as (
        select ut."gameId", ut."trophyId", ut."rarityPercent",
          (ut."earnedAt" at time zone 'UTC') at time zone (select tz from zona) as local
        from user_trophy ut
        where ut."userId" = ${userId} and ut.earned
      )
      select
        (select coalesce(sum(cast(earned->>'platinum' as integer)), 0)
           + count(*) filter (where platform = 'steam' and "progressPercent" = 100) from mios) as platinos,
        (select count(*) from mios) as juegos,
        (select count(review) from mios) as resenas,
        (select count(*) from mios where "progressPercent" > 0 and coalesce(genres, '[]')::jsonb ? 'Role-playing (RPG)') as rpgs,
        (select count(*) from friendship f
           where f.status = 'accepted' and (f."requesterId" = ${userId} or f."addresseeId" = ${userId})) as amigos,
        (select count(distinct pa.platform) from platform_account pa
           where pa."userId" = ${userId} and pa."isPublic" and pa.platform in ('psn', 'steam', 'xbox')) as plataformas,
        (select count(*) from trofeos t
           join game_trophy gt on gt."gameId" = t."gameId" and gt."trophyId" = t."trophyId"
           where gt.grade = 'platinum' and t."rarityPercent" < 5) as "platinoRaro",
        (select count(*) from trofeos where "rarityPercent" < 1) as "ultraRaros",
        (select count(*) from trophy_case_award a where a."userId" = ${userId} and a.rank = 1) as palmares,
        (select count(*) from clan_war w
           where w.estado = 'terminada'
             and w."ganadorId" in (select m."clanId" from clan_members m where m."userId" = ${userId})) as guerras,
        (select count(*) from coop_challenge c
           where c.estado = 'cumplido' and ${userId} in (c."creadorId", c."invitadoId")) as coop,
        (select count(*) from (
           select semana from mission_completion where "userId" = ${userId} group by semana having count(*) >= 4
         ) s) as "semanasPerfectas",
        (select count(*) from mission_completion where "userId" = ${userId}) as misiones,
        (select coalesce(max(nivel), 0) from season_result where "userId" = ${userId}) as "temporadaMax",
        (select count(*) from trophy_guide where "userId" = ${userId}) as guias,
        (select count(*) from boost_session s
           where s."hostId" = ${userId} and not s.cancelada and s."fechaHora" < now()
             and exists (select 1 from boost_participant p where p."sessionId" = s.id)) as sesiones,
        -- Instantes DISTINTOS, no trofeos: una plataforma puede apuntar cientos
        -- de logros al mismo segundo (importación, sincronización offline) y
        -- eso no es haber jugado de madrugada ni una maratón (visto: 230
        -- trofeos de un juego con una sola marca de tiempo).
        (select count(distinct local) from trofeos where local is not null and extract(hour from local) between 2 and 4) as noctambulo,
        (select coalesce(max(n), 0) from (
           select count(distinct local) as n from trofeos where local is not null group by date(local)
         ) d) as maraton
    `),
    nivel ?? getParagonLevel(userId).then((n) => n.level),
  ]);

  const n = (clave: string) => Number(fila?.[clave] ?? 0);
  return {
    pionero: 1,
    platinos: n("platinos"),
    juegos: n("juegos"),
    resenas: n("resenas"),
    amigos: n("amigos"),
    plataformas: n("plataformas"),
    rpgs: n("rpgs"),
    platinoRaro: n("platinoRaro"),
    ultraRaros: n("ultraRaros"),
    palmares: n("palmares"),
    guerras: n("guerras"),
    coop: n("coop"),
    semanasPerfectas: n("semanasPerfectas"),
    misiones: n("misiones"),
    temporadaMax: n("temporadaMax"),
    guias: n("guias"),
    sesiones: n("sesiones"),
    nivel: nivelCalculado,
    noctambulo: n("noctambulo"),
    maraton: n("maraton"),
  };
}
