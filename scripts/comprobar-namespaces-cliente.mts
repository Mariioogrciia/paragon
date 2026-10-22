/**
 * Comprueba que `NAMESPACES_CLIENTE` (src/i18n/clientMessages.ts) cubre
 * todos los `useTranslations("...")` del código — si falta uno, ese
 * componente se quedaría sin textos en el navegador. Y que cada namespace
 * EXISTE en messages/<carpeta>/es.json (6 oct 2026: "PerfilPage.amistad" sin
 * la carpeta "Perfil." pasaba la comprobación y la web enseñaba la clave
 * "PerfilPage.amistad.enviada" en vez del texto).
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

/** ¿Existe ese namespace en los textos en español? (la primera parte es la carpeta de messages/). */
function existe(ns: string): boolean {
  const [carpeta, ...resto] = ns.split(".");
  let nodo: unknown;
  try {
    nodo = JSON.parse(readFileSync(join("messages", carpeta, "es.json"), "utf8"));
  } catch {
    return false;
  }
  for (const parte of resto) {
    if (typeof nodo !== "object" || nodo === null || !(parte in nodo)) return false;
    nodo = (nodo as Record<string, unknown>)[parte];
  }
  return true;
}

const cubierto = (ns: string) => NAMESPACES_CLIENTE.some((n) => ns === n || ns.startsWith(`${n}.`));
/** Solo se manda una parte (p. ej. "Onboarding.forms" pero no "Onboarding" entero). */
const enParte = (ns: string) => NAMESPACES_CLIENTE.some((n) => n.startsWith(`${ns}.`));
const fallos: string[] = [];

for (const archivo of archivos("src")) {
  // Su propio comentario de ayuda lleva ejemplos de `useTranslations(...)`.
  if (archivo.endsWith("clientMessages.ts")) continue;
  const codigo = readFileSync(archivo, "utf8");
  for (const m of codigo.matchAll(/useTranslations\(([^)]*)\)/g)) {
    const arg = m[1].trim();
    const literal = arg.match(/^"([^"]+)"$/);
    if (!literal) fallos.push(`${archivo}: useTranslations(${arg}) sin namespace literal — añádelo a mano`);
    else if (!cubierto(literal[1]) && !enParte(literal[1])) fallos.push(`${archivo}: "${literal[1]}" no está en NAMESPACES_CLIENTE`);
    else if (!existe(literal[1])) fallos.push(`${archivo}: "${literal[1]}" no existe en messages/ (¿falta la carpeta delante?)`);
  }

  // Namespaces que se mandan solo en parte (22 oct 2026: "Onboarding",
  // "Perfil" y "Biblioteca" enteros eran 78 KB en el HTML de CADA página):
  // cada `t("sub.clave")` de un `const t = useTranslations("Ns")` tiene que
  // caer dentro de algo que sí se manda. Una clave que no se puede leer
  // (`t(variable)`, `t(\`${x}\`)`) no se puede comprobar: falla.
  for (const m of codigo.matchAll(/const (\w+) = useTranslations\("([^"]+)"\)/g)) {
    const [, variable, ns] = m;
    if (cubierto(ns)) continue;
    const llamada = new RegExp(`\\b${variable}(?:\\.rich|\\.raw|\\.markup|\\.has)?\\(\\s*([^)]*?)\\s*[,)]`, "g");
    for (const c of codigo.matchAll(llamada)) {
      const clave = c[1].match(/^(["'`])([A-Za-z_][\w]*)(?=[."'`])/);
      if (!clave) {
        fallos.push(`${archivo}: ${variable}(${c[1]}) con "${ns}" solo en parte — usa una clave literal o manda "${ns}" entero`);
        continue;
      }
      const ruta = `${ns}.${clave[2]}`;
      if (!cubierto(ruta)) fallos.push(`${archivo}: "${ruta}" no está en NAMESPACES_CLIENTE`);
    }
  }
}

for (const ns of NAMESPACES_CLIENTE) {
  if (!existe(ns)) fallos.push(`NAMESPACES_CLIENTE: "${ns}" no existe en messages/`);
}

if (fallos.length > 0) {
  console.error(fallos.join("\n"));
  process.exit(1);
}
console.log(`OK: ${NAMESPACES_CLIENTE.length} namespaces cubren todos los useTranslations del código.`);
