/**
 * Comprueba que `NAMESPACES_CLIENTE` (src/i18n/clientMessages.ts) cubre
 * todos los `useTranslations("...")` del código — si falta uno, ese
 * componente se quedaría sin textos en el navegador.
 *
 *   npx tsx scripts/comprobar-namespaces-cliente.mts
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { NAMESPACES_CLIENTE } from "../src/i18n/clientMessages";

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(ts|tsx)$/.test(nombre) ? [ruta] : [];
  });
}

const cubierto = (ns: string) => NAMESPACES_CLIENTE.some((n) => ns === n || ns.startsWith(`${n}.`));
const fallos: string[] = [];

for (const archivo of archivos("src")) {
  // Su propio comentario de ayuda lleva ejemplos de `useTranslations(...)`.
  if (archivo.endsWith("clientMessages.ts")) continue;
  const codigo = readFileSync(archivo, "utf8");
  for (const m of codigo.matchAll(/useTranslations\(([^)]*)\)/g)) {
    const arg = m[1].trim();
    const literal = arg.match(/^"([^"]+)"$/);
    if (!literal) fallos.push(`${archivo}: useTranslations(${arg}) sin namespace literal — añádelo a mano`);
    else if (!cubierto(literal[1])) fallos.push(`${archivo}: "${literal[1]}" no está en NAMESPACES_CLIENTE`);
  }
}

if (fallos.length > 0) {
  console.error(fallos.join("\n"));
  process.exit(1);
}
console.log(`OK: ${NAMESPACES_CLIENTE.length} namespaces cubren todos los useTranslations del código.`);
