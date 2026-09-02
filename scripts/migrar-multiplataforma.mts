/**
 * Migración del esquema de una sola plataforma (PSN) al multiplataforma.
 *
 * Va en dos fases porque `db:push` tiene que correr en medio: la tabla nueva
 * no existe hasta que se hace push, y las tablas viejas no se pueden convertir
 * con datos dentro (los ids de juego pasan a llevar prefijo de plataforma y
 * los ids de trofeo pasan de número a texto).
 *
 * Todo lo que se borra aquí es *derivado*: juegos, logros y progreso se
 * vuelven a traer de PSN y de Steam con un "Sincronizar ahora". Usuarios,
 * handles y amistades no se tocan.
 *
 *   npx tsx scripts/migrar-multiplataforma.mts   # fase 1: limpia
 *   npm run db:push                              # aplica el esquema nuevo
 *   npx tsx scripts/migrar-multiplataforma.mts   # fase 2: copia las cuentas
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const { db } = await import("../src/db/index");
const { sql } = await import("drizzle-orm");

async function existeTabla(nombre: string): Promise<boolean> {
  const filas = await db.execute<{ existe: boolean }>(sql`
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = ${nombre}
    ) as existe
  `);

  return Boolean(filas[0]?.existe);
}

const hayTablaNueva = await existeTabla("platform_account");

if (!hayTablaNueva) {
  console.log("Fase 1: vaciando las tablas derivadas…");

  // El orden da igual con CASCADE, pero las nombramos todas para que quede
  // escrito exactamente qué se borra.
  await db.execute(
    sql`truncate table "user_trophy", "user_game", "game_trophy", "game" cascade`,
  );

  console.log("   Hecho. Juegos, logros y progreso borrados (se vuelven a traer solos).");
  console.log("");
  console.log("Ahora:");
  console.log("   1. npm run db:push");
  console.log("   2. npx tsx scripts/migrar-multiplataforma.mts   (fase 2)");
} else {
  console.log("Fase 2: copiando las cuentas de PSN a la tabla nueva…");

  if (!(await existeTabla("psn_profile"))) {
    console.log("   No hay tabla psn_profile: no hay nada que copiar.");
  } else {
    const copiadas = await db.execute<{ userId: string }>(sql`
      insert into "platform_account"
        ("userId", "platform", "accountId", "username", "level", "avatarUrl", "isPublic", "syncedAt")
      select "userId", 'psn', "accountId", "onlineId", "trophyLevel", "avatarUrl", "isPublic", "syncedAt"
      from "psn_profile"
      on conflict ("userId", "platform") do nothing
      returning "userId"
    `);

    console.log(`   ${copiadas.length} cuenta(s) de PSN migradas.`);
  }

  console.log("");
  console.log("Listo. Entra en /ajustes y pulsa 'Sincronizar ahora' para repoblar la biblioteca.");
  console.log("Cuando todo esté bien, borra `psnProfiles` de src/db/schema.ts y vuelve a hacer push.");
}

process.exit(0);
