/**
 * Prueba de extremo a extremo de la sincronización, sin pasar por el navegador.
 *
 * Crea un usuario de prueba, importa una biblioteca real de PSN, comprueba lo
 * guardado y borra el usuario al terminar. Sirve para validar el camino
 * completo (PSN -> base de datos -> lectura) sin depender de OAuth.
 *
 *   npx tsx scripts/probar-sync.ts <accountId de PSN>
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const platform = (process.argv[2] ?? "psn") as "psn" | "steam";
const accountId = process.argv[3];

if (!accountId || (platform !== "psn" && platform !== "steam")) {
  console.error(
    "Uso: npx tsx scripts/probar-sync.mts <psn|steam> <accountId de PSN o SteamID64>",
  );
  process.exit(1);
}

const cuenta = { platform, accountId };

const { db } = await import("../src/db/index");
const { users, userGames, userTrophies, games, gameTrophies } = await import(
  "../src/db/schema"
);
const { syncLibrary, syncGameTrophies } = await import("../src/lib/sync");
const { getLibrary, getGameDetail } = await import("../src/lib/profiles");
const { eq } = await import("drizzle-orm");

const USER_ID = "prueba-sync";

async function limpiar() {
  await db.delete(userTrophies).where(eq(userTrophies.userId, USER_ID));
  await db.delete(userGames).where(eq(userGames.userId, USER_ID));
  await db.delete(users).where(eq(users.id, USER_ID));
}

try {
  await limpiar();

  await db.insert(users).values({
    id: USER_ID,
    name: "Prueba",
    handle: "prueba_sync",
  });

  console.log(`1. Importando biblioteca desde ${platform}…`);
  const total = await syncLibrary(USER_ID, cuenta);
  console.log(`   ${total} juegos guardados.`);

  const perfil = {
    userId: USER_ID,
    handle: "prueba_sync",
    displayName: "Prueba",
    image: null,
    accounts: [
      {
        platform,
        accountId,
        username: "prueba",
        level: null,
        avatarUrl: null,
        isPublic: true,
        syncedAt: null,
      },
    ],
  };

  console.log("2. Leyendo la biblioteca desde la base de datos…");
  const { games: leidos } = await getLibrary(perfil);
  console.log(`   ${leidos.length} juegos leídos. Los 3 más recientes:`);
  for (const g of leidos.slice(0, 3)) {
    console.log(
      `   - ${g.title} (${g.deviceLabel}) ${g.progressPercent}% · ` +
        `${g.earnedTotal}/${g.definedTotal}${g.earned?.platinum ? " · PLATINO" : ""}`,
    );
  }

  const objetivo = leidos.find((g) => g.progressPercent > 0 && g.progressPercent < 100);
  if (!objetivo) {
    console.log("3. No hay ningún juego a medias para probar el detalle.");
  } else {
    console.log(`3. Trayendo trofeos de "${objetivo.title}"…`);
    const n = await syncGameTrophies(USER_ID, cuenta, objetivo.id);
    console.log(`   ${n} logros guardados.`);

    const detalle = await getGameDetail(perfil, objetivo.id);
    const pendientes = detalle!.trophies.filter((t) => !t.earned);
    console.log(
      `   ${detalle!.trophies.length} leídos, ${pendientes.length} pendientes.`,
    );

    const conProgreso = detalle!.trophies.filter((t) => t.progress);
    console.log(
      `   Trofeos con hito parcial: ${conProgreso.length}` +
        (conProgreso[0]
          ? ` (ej. "${conProgreso[0].name}" ${conProgreso[0].progress!.current}/${conProgreso[0].progress!.target})`
          : ""),
    );

    const raro = [...detalle!.trophies]
      .filter((t) => t.rarityPercent !== undefined)
      .sort((a, b) => a.rarityPercent! - b.rarityPercent!)[0];
    if (raro) console.log(`   El más raro: "${raro.name}" (${raro.rarityPercent}%)`);
  }

  console.log("4. Catálogo compartido:");
  const [{ count: nGames }] = await db
    .select({ count: db.$count(games) })
    .from(games)
    .limit(1);
  console.log(`   ${nGames} juegos en el catálogo.`);
} finally {
  await limpiar();
  console.log("Usuario de prueba borrado.");
  process.exit(0);
}
