import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Cliente de base de datos.
 *
 * La conexión se abre en el primer uso, no al importar el módulo. Importa
 * porque `next build` evalúa los módulos para recolectar las páginas: si el
 * cliente se construyera arriba del todo, compilar sin DATABASE_URL sería
 * imposible — y en Vercel el build corre antes de que existan las variables.
 *
 * `prepare: false` es obligatorio si el Postgres va detrás de un pooler en modo
 * transacción (Supabase, PgBouncer): las sentencias preparadas no sobreviven al
 * cambio de conexión entre requests.
 */

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  conn?: ReturnType<typeof postgres>;
  db?: Db;
};

function connect(): Db {
  if (globalForDb.db) return globalForDb.db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Copia .env.example a .env.local y rellénalo.",
    );
  }

  const conn = globalForDb.conn ?? postgres(url, { prepare: false });
  const instance = drizzle(conn, { schema });

  // En dev el módulo se reevalúa en cada recarga; sin esto se acumularían
  // conexiones abiertas hasta agotar el pool.
  if (process.env.NODE_ENV !== "production") {
    globalForDb.conn = conn;
    globalForDb.db = instance;
  }

  return instance;
}

/**
 * Instancia real de Drizzle.
 *
 * El adaptador de Auth.js inspecciona el objeto para deducir el dialecto, así
 * que a él hay que darle esto y no el proxy de abajo.
 */
export function getDb(): Db {
  return connect();
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(connect(), prop, receiver);
  },
});

/** Para avisar en la UI en vez de reventar cuando aún no hay base de datos. */
export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);
