import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Tráfico dentro de Paragon (21 oct 2026), para Admin → Analítica. Vercel
 * Analytics lo mide, pero sus datos no se ven desde la app. Esto cuenta en
 * nuestra propia base, sin cookies ni almacenamiento en el navegador:
 *
 * - `trafico_dia`: por día y tipo de página (lib/traficoRutas.ts), cuántas
 *   vistas, cuántas eran entradas (la primera página de una visita) y
 *   cuántas desde el móvil. Sin IP, sin navegador, sin nada de la persona.
 * - `trafico_origen`: por día, de dónde llegan las entradas (dominio).
 * - `actividad_usuario`: qué días entra cada usuario con sesión, para saber
 *   cuánta gente usa Paragon (activos por día/semana/mes). Solo la fecha; se
 *   borra a los 90 días (está en la política de privacidad).
 *
 * El "día" es el de Madrid. Tablas creadas solas la primera vez; nada lanza.
 */

const ZONA = "Europe/Madrid";
let tablasListas: Promise<boolean> | null = null;

function asegurarTablas(): Promise<boolean> {
  tablasListas ??= (async () => {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "trafico_dia" (
          "dia" date NOT NULL,
          "ruta" text NOT NULL,
          "vistas" integer NOT NULL DEFAULT 0,
          "entradas" integer NOT NULL DEFAULT 0,
          "movil" integer NOT NULL DEFAULT 0,
          PRIMARY KEY ("dia", "ruta")
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "trafico_origen" (
          "dia" date NOT NULL,
          "origen" text NOT NULL,
          "entradas" integer NOT NULL DEFAULT 0,
          PRIMARY KEY ("dia", "origen")
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "actividad_usuario" (
          "dia" date NOT NULL,
          "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
          PRIMARY KEY ("dia", "userId")
        )
      `);
      for (const tabla of ["trafico_dia", "trafico_origen", "actividad_usuario"]) {
        await db.execute(sql.raw(`ALTER TABLE "${tabla}" ENABLE ROW LEVEL SECURITY`));
      }
      return true;
    } catch (error) {
      console.error("[trafico] no se pudieron crear las tablas", error);
      tablasListas = null;
      return false;
    }
  })();
  return tablasListas;
}

const HOY = sql.raw(`(now() at time zone '${ZONA}')::date`);

/** Una vista de página. `origen` solo en la primera página de la visita. Nunca lanza. */
export async function registrarVista(v: { ruta: string; entrada: boolean; origen: string | null; movil: boolean; userId: string | null }): Promise<void> {
  try {
    if (!(await asegurarTablas())) return;
    await db.execute(sql`
      INSERT INTO "trafico_dia" ("dia", "ruta", "vistas", "entradas", "movil")
      VALUES (${HOY}, ${v.ruta}, 1, ${v.entrada ? 1 : 0}, ${v.movil ? 1 : 0})
      ON CONFLICT ("dia", "ruta") DO UPDATE SET
        "vistas" = "trafico_dia"."vistas" + 1,
        "entradas" = "trafico_dia"."entradas" + EXCLUDED."entradas",
        "movil" = "trafico_dia"."movil" + EXCLUDED."movil"
    `);
    if (v.entrada && v.origen) {
      await db.execute(sql`
        INSERT INTO "trafico_origen" ("dia", "origen", "entradas") VALUES (${HOY}, ${v.origen}, 1)
        ON CONFLICT ("dia", "origen") DO UPDATE SET "entradas" = "trafico_origen"."entradas" + 1
      `);
    }
    if (v.userId) {
      await db.execute(sql`INSERT INTO "actividad_usuario" ("dia", "userId") VALUES (${HOY}, ${v.userId}) ON CONFLICT DO NOTHING`);
    }
  } catch (error) {
    console.error("[trafico] registrar", error);
  }
}

export interface PuntoDia {
  dia: string;
  valor: number;
}

export interface Analitica {
  dias: number;
  vistasPorDia: (PuntoDia & { entradas: number })[];
  activosPorDia: PuntoDia[];
  altasPorDia: PuntoDia[];
  syncPorDia: (PuntoDia & { trofeos: number })[];
  totales: { vistas: number; entradas: number; movil: number; altas: number; trofeosNuevos: number; syncs: number };
  /** Lo mismo del periodo anterior de igual largo, para las variaciones. */
  anteriores: { vistas: number; entradas: number; altas: number };
  activos: { hoy: number; semana: number; mes: number };
  topRutas: { ruta: string; vistas: number; entradas: number }[];
  topOrigenes: { origen: string; entradas: number }[];
}

/** Serie de N días hasta hoy (Madrid), con los días sin datos a cero. */
function serieCompleta<T extends { dia: string }>(dias: number, filas: T[], vacio: Omit<T, "dia">): T[] {
  const porDia = new Map(filas.map((f) => [f.dia, f]));
  const hoy = new Date(new Date().toLocaleString("en-US", { timeZone: ZONA }));
  return Array.from({ length: dias }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - (dias - 1 - i));
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return porDia.get(clave) ?? ({ dia: clave, ...vacio } as T);
  });
}

/** Todo lo de Admin → Analítica para los últimos `dias` días. */
export async function analitica(dias: number): Promise<Analitica> {
  await asegurarTablas();
  const desde = sql`${HOY} - ${dias - 1}::int`;
  const desdeAnterior = sql`${HOY} - ${2 * dias - 1}::int`;
  const numero = (v: unknown) => Number(v ?? 0);

  const [vistas, activosDia, altas, syncs, [totales], [anteriores], [activos], rutas, origenes] = await Promise.all([
    db.execute<{ dia: string; vistas: number; entradas: number }>(sql`
      SELECT "dia"::text AS "dia", sum("vistas")::int AS "vistas", sum("entradas")::int AS "entradas"
      FROM "trafico_dia" WHERE "dia" >= ${desde} GROUP BY "dia"`),
    db.execute<{ dia: string; valor: number }>(sql`
      SELECT "dia"::text AS "dia", count(*)::int AS "valor" FROM "actividad_usuario" WHERE "dia" >= ${desde} GROUP BY "dia"`),
    db.execute<{ dia: string; valor: number }>(sql`
      SELECT ("createdAt" at time zone 'UTC' at time zone ${ZONA})::date::text AS "dia", count(*)::int AS "valor"
      FROM "user" WHERE ("createdAt" at time zone 'UTC' at time zone ${ZONA})::date >= ${desde} GROUP BY 1`),
    db.execute<{ dia: string; valor: number; trofeos: number }>(sql`
      SELECT ("createdAt" at time zone 'UTC' at time zone ${ZONA})::date::text AS "dia", count(*)::int AS "valor", sum("newTrophies")::int AS "trofeos"
      FROM "sync_run" WHERE ("createdAt" at time zone 'UTC' at time zone ${ZONA})::date >= ${desde} GROUP BY 1`),
    db.execute<{ vistas: number; entradas: number; movil: number }>(sql`
      SELECT coalesce(sum("vistas"), 0)::int AS "vistas", coalesce(sum("entradas"), 0)::int AS "entradas", coalesce(sum("movil"), 0)::int AS "movil"
      FROM "trafico_dia" WHERE "dia" >= ${desde}`),
    db.execute<{ vistas: number; entradas: number; altas: number }>(sql`
      SELECT
        (SELECT coalesce(sum("vistas"), 0)::int FROM "trafico_dia" WHERE "dia" >= ${desdeAnterior} AND "dia" < ${desde}) AS "vistas",
        (SELECT coalesce(sum("entradas"), 0)::int FROM "trafico_dia" WHERE "dia" >= ${desdeAnterior} AND "dia" < ${desde}) AS "entradas",
        (SELECT count(*)::int FROM "user" WHERE ("createdAt" at time zone 'UTC' at time zone ${ZONA})::date >= ${desdeAnterior}
           AND ("createdAt" at time zone 'UTC' at time zone ${ZONA})::date < ${desde}) AS "altas"`),
    db.execute<{ hoy: number; semana: number; mes: number }>(sql`
      SELECT
        count(DISTINCT "userId") FILTER (WHERE "dia" = ${HOY})::int AS "hoy",
        count(DISTINCT "userId") FILTER (WHERE "dia" > ${HOY} - 7)::int AS "semana",
        count(DISTINCT "userId") FILTER (WHERE "dia" > ${HOY} - 30)::int AS "mes"
      FROM "actividad_usuario" WHERE "dia" > ${HOY} - 30`),
    db.execute<{ ruta: string; vistas: number; entradas: number }>(sql`
      SELECT "ruta", sum("vistas")::int AS "vistas", sum("entradas")::int AS "entradas"
      FROM "trafico_dia" WHERE "dia" >= ${desde} GROUP BY "ruta" ORDER BY 2 DESC LIMIT 12`),
    db.execute<{ origen: string; entradas: number }>(sql`
      SELECT "origen", sum("entradas")::int AS "entradas"
      FROM "trafico_origen" WHERE "dia" >= ${desde} GROUP BY "origen" ORDER BY 2 DESC LIMIT 10`),
  ]);

  const syncsLista = [...syncs].map((s) => ({ dia: s.dia, valor: numero(s.valor), trofeos: numero(s.trofeos) }));
  const altasLista = [...altas].map((a) => ({ dia: a.dia, valor: numero(a.valor) }));
  return {
    dias,
    vistasPorDia: serieCompleta(dias, [...vistas].map((v) => ({ dia: v.dia, valor: numero(v.vistas), entradas: numero(v.entradas) })), { valor: 0, entradas: 0 }),
    activosPorDia: serieCompleta(dias, [...activosDia].map((a) => ({ dia: a.dia, valor: numero(a.valor) })), { valor: 0 }),
    altasPorDia: serieCompleta(dias, altasLista, { valor: 0 }),
    syncPorDia: serieCompleta(dias, syncsLista, { valor: 0, trofeos: 0 }),
    totales: {
      vistas: numero(totales?.vistas),
      entradas: numero(totales?.entradas),
      movil: numero(totales?.movil),
      altas: altasLista.reduce((s, a) => s + a.valor, 0),
      trofeosNuevos: syncsLista.reduce((s, a) => s + a.trofeos, 0),
      syncs: syncsLista.reduce((s, a) => s + a.valor, 0),
    },
    anteriores: { vistas: numero(anteriores?.vistas), entradas: numero(anteriores?.entradas), altas: numero(anteriores?.altas) },
    activos: { hoy: numero(activos?.hoy), semana: numero(activos?.semana), mes: numero(activos?.mes) },
    topRutas: [...rutas].map((r) => ({ ruta: r.ruta, vistas: numero(r.vistas), entradas: numero(r.entradas) })),
    topOrigenes: [...origenes].map((o) => ({ origen: o.origen, entradas: numero(o.entradas) })),
  };
}

/** Limpieza del cron: la actividad por usuario dura 90 días; el tráfico agregado, dos años. */
export async function limpiarTrafico(): Promise<void> {
  try {
    if (!(await asegurarTablas())) return;
    await db.execute(sql`DELETE FROM "actividad_usuario" WHERE "dia" < ${HOY} - 90`);
    await db.execute(sql`DELETE FROM "trafico_dia" WHERE "dia" < ${HOY} - 730`);
    await db.execute(sql`DELETE FROM "trafico_origen" WHERE "dia" < ${HOY} - 730`);
  } catch (error) {
    console.error("[trafico] limpiar", error);
  }
}
