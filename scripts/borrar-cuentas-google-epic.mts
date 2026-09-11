import postgres from "postgres";
import "dotenv/config";

/**
 * Borra las cuentas de Google Play y Epic Games de `platform_account` —
 * pedido explícito del usuario el 11 de septiembre de 2026, al quitar esas
 * dos plataformas (junto con Ubisoft, que ya estaba vacía) de "Cuentas de
 * Juegos". Confirmado antes de borrar: `resolveGoogle`/`resolveEpic`
 * devolvían siempre `legible: false` — ninguna de las dos guardaba un solo
 * dato sincronizado de verdad, solo el nombre de usuario.
 *
 * Ejecutado una vez contra producción. Mismo patrón que
 * scripts/borrar-notification-y-webhook.mts: SQL explícito, no db:push.
 */
const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

const borradas = await sql`
  delete from platform_account
  where platform in ('google', 'epic')
  returning "userId", platform, "accountId", username
`;

console.log(`Borradas ${borradas.length} filas:`);
for (const fila of borradas) {
  console.log(`  ${fila.platform} — userId ${fila.userId} (${fila.username})`);
}

await sql.end();
