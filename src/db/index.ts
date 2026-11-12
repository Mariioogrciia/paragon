import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import net from "node:net";
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
  ultimoUso?: number;
};

/**
 * Cloud Run (11 nov 2026): sin peticiones, la instancia se queda CONGELADA
 * (sin CPU), y los temporizadores de `idle_timeout` no corren. Mientras,
 * Supabase o la red cierran esas conexiones por su lado, y al despertar la
 * primera consulta salía por un socket muerto y esperaba para siempre: las
 * fichas y los perfiles daban 504 a los 5 minutos y, con el pool lleno de
 * zombis, también la portada. Si llevamos más que esto sin tocar la base,
 * se estrena un pool nuevo y el viejo se cierra aparte.
 */
const PAUSA_MAX_MS = 30_000;

/**
 * Socket que se corta solo si pasa este tiempo sin un solo byte (11 nov
 * 2026): una conexión muerta a nivel de red ya no deja una consulta
 * esperando para siempre, falla y el pool abre otra. Más que
 * `statement_timeout` (30 s), así una consulta lenta pero viva no se toca;
 * las conexiones ociosas las cierra antes `idle_timeout` (20 s).
 */
const SOCKET_SIN_DATOS_MS = 45_000;

function socketConTope(o: { host: string[]; port: number[] }): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const s = net.connect(o.port[0], o.host[0]);
    s.setTimeout(SOCKET_SIN_DATOS_MS, () => s.destroy(new Error("Postgres no responde (socket sin datos)")));
    s.once("connect", () => resolve(s));
    s.once("error", reject);
  });
}

function connect(): Db {
  const ahora = Date.now();
  if (globalForDb.db && globalForDb.conn) {
    const pausa = ahora - (globalForDb.ultimoUso ?? ahora);
    globalForDb.ultimoUso = ahora;
    if (pausa <= PAUSA_MAX_MS) return globalForDb.db;
    const viejo = globalForDb.conn;
    globalForDb.conn = undefined;
    globalForDb.db = undefined;
    // Las consultas en vuelo (no debería haber: estaba parado) tienen 5 s.
    void viejo.end({ timeout: 5 }).catch(() => {});
  }
  globalForDb.ultimoUso = ahora;

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
      // `socket` existe en postgres.js pero no en sus tipos.
      ...({ socket: socketConTope } as object),
      // En Cloud Run una instancia atiende muchas peticiones a la vez (no
      // una por función como en Vercel): más conexiones por pool.
      max: Number(process.env.DB_POOL_MAX ?? (process.env.K_SERVICE ? 10 : 5)),
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
