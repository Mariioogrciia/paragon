import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { prepararTablas } from "@/lib/esquema";

/**
 * Ajustes del sistema que cambia el desarrollador desde Admin → Sistema
 * (21 oct 2026), sin redesplegar. De momento: pausar la sincronización de
 * una plataforma (si OpenXBL cae o Sony rechaza las peticiones, pausarla
 * evita fallos en cadena; la app sigue enseñando lo ya guardado).
 *
 * Tabla clave/valor creada sola la primera vez. Las pausas se leen con una
 * caché de un minuto por instancia: el cron las mira por cada cuenta.
 */

export const PLATAFORMAS_PAUSABLES = ["psn", "steam", "xbox"] as const;
export type PlataformaPausable = (typeof PLATAFORMAS_PAUSABLES)[number];

let tablaLista: Promise<boolean> | null = null;
function asegurarTabla(): Promise<boolean> {
  tablaLista ??= (async () => {
    try {
      // Sin tocar nada si ya está todo (ver lib/esquema.ts: el ALTER de cada arranque
      // bloqueaba la tabla y dejaba colgado lo demás).
      const ok = await prepararTablas({
        tablas: ["ajuste_sistema"],
        ddl: [
        sql`
        CREATE TABLE IF NOT EXISTS "ajuste_sistema" (
          "clave" text PRIMARY KEY,
          "valor" text NOT NULL,
          "actualizado" timestamptz NOT NULL DEFAULT now()
        )
      `,
        ],
      });
      if (!ok) throw new Error("tablas sin crear");
      return true;
    } catch (error) {
      console.error("[ajustesSistema] no se pudo crear la tabla", error);
      tablaLista = null;
      return false;
    }
  })();
  return tablaLista;
}

let cache: { hasta: number; pausadas: Set<string> } | null = null;

/** Las plataformas pausadas. Si falla la lectura, ninguna: mejor sincronizar de más que parar sin querer. */
export async function plataformasPausadas(): Promise<Set<string>> {
  if (cache && cache.hasta > Date.now()) return cache.pausadas;
  try {
    if (!(await asegurarTabla())) return new Set();
    const filas = await db.execute<{ clave: string }>(sql`SELECT "clave" FROM "ajuste_sistema" WHERE "clave" LIKE 'pausa-%' AND "valor" = '1'`);
    const pausadas = new Set([...filas].map((f) => f.clave.slice("pausa-".length)));
    cache = { hasta: Date.now() + 60_000, pausadas };
    return pausadas;
  } catch (error) {
    console.error("[ajustesSistema] leer pausas", error);
    return new Set();
  }
}

export async function pausarPlataforma(plataforma: PlataformaPausable, pausada: boolean): Promise<void> {
  if (!(await asegurarTabla())) return;
  await db.execute(sql`
    INSERT INTO "ajuste_sistema" ("clave", "valor", "actualizado") VALUES (${`pausa-${plataforma}`}, ${pausada ? "1" : "0"}, now())
    ON CONFLICT ("clave") DO UPDATE SET "valor" = EXCLUDED."valor", "actualizado" = now()
  `);
  cache = null;
}
