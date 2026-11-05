/**
 * Prueba el lector de RetroAchievements contra la API real (con RA_API_KEY y
 * RA_API_USER en .env.local) antes de darlo por bueno:
 *
 *   npx tsx scripts/probar-retro.mts <usuario>
 *
 * Imprime los campos tal como llegan, para compararlos con lo que espera
 * src/lib/retro/client.ts (la forma salió de su documentación).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const [usuario] = process.argv.slice(2);
const clave = process.env.RA_API_KEY;
const yo = process.env.RA_API_USER;
if (!usuario || !clave || !yo) {
  console.error("Uso: npx tsx scripts/probar-retro.mts <usuario>   (con RA_API_KEY y RA_API_USER en .env.local)");
  process.exit(1);
}

async function pedir(endpoint: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ y: clave!, z: yo!, ...params });
  const res = await fetch(`https://retroachievements.org/API/${endpoint}.php?${qs}`);
  console.log(`\n== ${endpoint} → ${res.status}`);
  const json = await res.json().catch(() => null);
  console.log(JSON.stringify(json, null, 2).slice(0, 2500));
  return json as Record<string, unknown> | null;
}

const perfil = await pedir("API_GetUserProfile", { u: usuario });
const progreso = await pedir("API_GetUserCompletionProgress", { u: String(perfil?.ULID ?? usuario), c: "3", o: "0" });
const primero = (progreso?.Results as { GameID?: number }[] | undefined)?.[0]?.GameID;
if (primero) await pedir("API_GetGameInfoAndUserProgress", { u: String(perfil?.ULID ?? usuario), g: String(primero) });
