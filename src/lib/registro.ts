import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { prepararTablas } from "@/lib/esquema";

/**
 * Registro de eventos de Paragon (21 oct 2026), para Admin → Registro.
 * Antes, lo que pasaba en el servidor solo quedaba en los logs de Vercel
 * (que en el plan Hobby duran una hora y no se ven desde la app) o, como
 * mucho, en un aviso al desarrollador. Aquí queda lo importante, con fecha:
 * - `cron`: el resumen de cada pasada de la sincronización.
 * - `sync`: cada cuenta que falla al sincronizar.
 * - `vigilancia`: las alertas de servicios externos (Steam, Xbox, PSN...).
 * - `admin`: lo que hace el desarrollador desde el panel (auditoría).
 * - `cliente`: errores que ve alguien en la web (error.tsx).
 *
 * Tabla creada sola la primera vez (como la bandeja, lib/bandeja.ts). Nada
 * de aquí lanza: un registro que falla no puede tumbar lo que lo provocó.
 * Se borra lo de más de 30 días en el cron. No guarda datos de usuarios más
 * allá de su id cuando hace falta para saber de quién es una cuenta que falla.
 */

export type NivelRegistro = "info" | "aviso" | "error";
export type OrigenRegistro = "cron" | "sync" | "vigilancia" | "admin" | "cliente" | "psn";

export interface EntradaRegistro {
  id: number;
  at: string;
  nivel: NivelRegistro;
  origen: OrigenRegistro;
  mensaje: string;
  datos: Record<string, unknown> | null;
}

const DIAS_RETENCION = 30;
let tablaLista: Promise<boolean> | null = null;

function asegurarTabla(): Promise<boolean> {
  tablaLista ??= (async () => {
    try {
      // Sin tocar nada si ya está todo (ver lib/esquema.ts: el ALTER de cada arranque
      // bloqueaba la tabla y dejaba colgado lo demás).
      const ok = await prepararTablas({
        tablas: ["registro"],
        indices: ["registro_at_idx"],
        ddl: [
        sql`
        CREATE TABLE IF NOT EXISTS "registro" (
          "id" bigserial PRIMARY KEY,
          "at" timestamptz NOT NULL DEFAULT now(),
          "nivel" text NOT NULL,
          "origen" text NOT NULL,
          "mensaje" text NOT NULL,
          "datos" jsonb
        )
      `,
        sql`CREATE INDEX IF NOT EXISTS "registro_at_idx" ON "registro" ("at" DESC)`,
        ],
      });
      if (!ok) throw new Error("tablas sin crear");
      return true;
    } catch (error) {
      console.error("[registro] no se pudo crear la tabla", error);
      tablaLista = null;
      return false;
    }
  })();
  return tablaLista;
}

/** Apunta un evento. Nunca lanza. */
export async function registrar(nivel: NivelRegistro, origen: OrigenRegistro, mensaje: string, datos?: Record<string, unknown>): Promise<void> {
  try {
    if (!(await asegurarTabla())) return;
    await db.execute(sql`
      INSERT INTO "registro" ("nivel", "origen", "mensaje", "datos")
      VALUES (${nivel}, ${origen}, ${mensaje.slice(0, 500)}, ${datos ? JSON.stringify(datos).slice(0, 4000) : null}::jsonb)
    `);
  } catch (error) {
    console.error("[registro] apuntar", error);
  }
}

/** Lo último, con filtros opcionales; `antesDe` es el id desde el que seguir (paginación). */
export async function leerRegistro(opciones: { nivel?: NivelRegistro; origen?: OrigenRegistro; antesDe?: number; limite?: number } = {}): Promise<EntradaRegistro[]> {
  if (!(await asegurarTabla())) return [];
  const limite = Math.min(200, opciones.limite ?? 50);
  const filas = await db.execute<{ id: string; at: string; nivel: NivelRegistro; origen: OrigenRegistro; mensaje: string; datos: Record<string, unknown> | null }>(sql`
    SELECT "id", "at"::text AS "at", "nivel", "origen", "mensaje", "datos"
    FROM "registro"
    WHERE true
      ${opciones.nivel ? sql`AND "nivel" = ${opciones.nivel}` : sql``}
      ${opciones.origen ? sql`AND "origen" = ${opciones.origen}` : sql``}
      ${opciones.antesDe ? sql`AND "id" < ${opciones.antesDe}` : sql``}
    ORDER BY "id" DESC
    LIMIT ${limite}
  `);
  return [...filas].map((f) => ({ ...f, id: Number(f.id) }));
}

/** Cuántos errores y avisos hubo en las últimas 24 h (para el resumen del panel). */
export async function resumenRegistro24h(): Promise<{ errores: number; avisos: number }> {
  if (!(await asegurarTabla())) return { errores: 0, avisos: 0 };
  const [fila] = await db.execute<{ errores: number; avisos: number }>(sql`
    SELECT count(*) FILTER (WHERE "nivel" = 'error')::int AS "errores", count(*) FILTER (WHERE "nivel" = 'aviso')::int AS "avisos"
    FROM "registro" WHERE "at" > now() - interval '24 hours'
  `);
  return { errores: Number(fila?.errores ?? 0), avisos: Number(fila?.avisos ?? 0) };
}

/** Limpieza del cron. */
export async function limpiarRegistro(): Promise<void> {
  try {
    if (!(await asegurarTabla())) return;
    await db.execute(sql`DELETE FROM "registro" WHERE "at" < now() - make_interval(days => ${DIAS_RETENCION})`);
  } catch (error) {
    console.error("[registro] limpiar", error);
  }
}
