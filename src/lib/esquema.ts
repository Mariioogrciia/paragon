import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";

/**
 * Tablas que se crean solas la primera vez (22 oct 2026).
 *
 * Antes cada módulo lanzaba sus `CREATE TABLE IF NOT EXISTS` y un
 * `ALTER TABLE … ENABLE ROW LEVEL SECURITY` CADA VEZ que Vercel arrancaba una
 * instancia nueva. Ese ALTER pide el bloqueo más fuerte de Postgres: espera a
 * que acabe cualquier escritura en la tabla (y en las de tráfico se escribe en
 * cada visita), y mientras espera, TODO lo que llega detrás —hasta un SELECT—
 * se queda en la cola. Comprobado en local: un SELECT normal esperó 3,6 s
 * detrás de él. Es lo que dejaba Admin colgado hasta el 504
 * (FUNCTION_INVOCATION_TIMEOUT) y la campana a veces lenta.
 *
 * Ahora primero se mira en el catálogo (una lectura que no bloquea nada) si
 * ya está todo: tablas, índices y RLS. Solo si falta algo se ejecuta el DDL,
 * y con `lock_timeout` de 3 s, para que nunca forme cola: si no consigue el
 * bloqueo, falla rápido y se reintenta en otra ocasión.
 *
 * `ddl`: sentencias idempotentes (CREATE … IF NOT EXISTS). Devuelve si las
 * tablas existen (aunque no haya podido activar el RLS esta vez).
 */
export async function prepararTablas(opciones: { tablas: string[]; indices?: string[]; ddl: SQL[] }): Promise<boolean> {
  const { tablas, indices = [], ddl } = opciones;
  const nombres = [...tablas, ...indices];

  const leerCatalogo = async () =>
    db.execute<{ relname: string; relkind: string; relrowsecurity: boolean }>(sql`
      SELECT c.relname, c.relkind, c.relrowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = current_schema() AND c.relname IN (${sql.join(nombres.map((n) => sql`${n}`), sql`, `)})
    `);

  const estado = new Map([...(await leerCatalogo())].map((f) => [f.relname, f]));
  const sinRls = tablas.filter((t) => estado.has(t) && !estado.get(t)!.relrowsecurity);
  const falta = nombres.some((n) => !estado.has(n));
  if (!falta && sinRls.length === 0) return true;

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL lock_timeout = '3s'`);
      for (const sentencia of ddl) await tx.execute(sentencia);
      // Las recién creadas también: aún no tenían RLS.
      for (const t of tablas) {
        if (!estado.has(t) || sinRls.includes(t)) await tx.execute(sql.raw(`ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY`));
      }
    });
    return true;
  } catch (error) {
    console.error("[esquema]", tablas.join(", "), error);
    // Sin el bloqueo a tiempo: si las tablas ya existían, se puede seguir.
    return !tablas.some((t) => !estado.has(t));
  }
}
