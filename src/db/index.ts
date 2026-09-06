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
 *
 * La conexión se cachea en `globalThis` EN TODOS los entornos, dev incluido.
 * Antes solo se cacheaba fuera de producción, con la idea de que en
 * serverless cada invocación es un proceso nuevo — pero un cold start solo
 * pasa una vez; mientras la instancia de la función siga caliente (que es
 * la mayoría de las peticiones), el módulo NO se reevalúa, así que sin
 * cachear, `connect()` (y el proxy `db`, que lo llama en cada acceso a una
 * propiedad) abría un cliente Postgres — hasta 10 sockets cada uno — por
 * cada llamada, sin cerrar nunca los anteriores. Resultado: "max client
 * connections reached" en Supabase y la app cada vez más lenta según se
 * acumulaban. El caso que sí hay que cubrir es dev con recarga en caliente,
 * donde el módulo se reevalúa a cada guardado — y `globalThis` sobrevive
 * exactamente a eso, en cualquier entorno.
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

  // `max` bajo a propósito: en serverless puede haber muchas instancias de
  // función calientes a la vez, cada una con su propio pool — el límite de
  // Supabase (200 en el plan gratuito) es compartido entre todas.
  //
  // `idle_timeout`/`max_lifetime`/`connect_timeout`: sin esto, una conexión
  // que se queda colgada a nivel de red (blip con Supabase, socket que deja
  // de responder) ocupa su hueco del pool PARA SIEMPRE — con `max: 5`, basta
  // con que esto le pase a 1 o 2 conexiones para que el resto de peticiones
  // hagan cola sin límite de tiempo (visto de verdad: una petición tardó
  // 131 minutos). `max_lifetime` recicla cada conexión periódicamente aunque
  // esté "sana", así una zombi nunca dura más de esa ventana.
  const conn =
    globalForDb.conn ??
    postgres(url, {
      prepare: false,
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 30,
      // Tope duro por sentencia. Sin esto, una consulta que se queda esperando
      // una respuesta que no llega nunca retiene su conexión para siempre — y
      // con `max: 5`, cinco de esas dejan la app entera colgada (medido: con
      // el pool agotado, /feed y /ligas también se cuelgan, no solo el
      // perfil; solo responden las páginas cacheadas, que no piden conexión).
      // 30s es muy holgado: la consulta más lenta medida de verdad en esta
      // app son ~300ms (pg_stat_statements).
      connection: { statement_timeout: 30_000 },
    });
  const instance = drizzle(conn, { schema });

  globalForDb.conn = conn;
  globalForDb.db = instance;

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
