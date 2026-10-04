// Genera res/values*/strings.xml de la app a partir de textos.json (una sola
// fuente con los 4 idiomas: es por defecto, en, de, fr — los mismos que la web).
// Uso: node android/i18n/generar.mjs   (desde la raíz del repo)
//
// En textos.json los huecos se escriben {0}, {1}...; aquí pasan a %1$s, %2$s
// (stringResource(R.string.x, a, b) en Compose / Textos.t(R.string.x, a, b) fuera).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const res = join(aqui, "..", "app", "src", "main", "res");
const textos = JSON.parse(readFileSync(join(aqui, "textos.json"), "utf8"));
const IDIOMAS = { es: "values", en: "values-en", de: "values-de", fr: "values-fr" };
// Fijos de Capacitor/Android que ya vivían en values/strings.xml.
const FIJOS = {
  app_name: "Paragon",
  title_activity_main: "Paragon",
  package_name: "com.paragon.app",
  custom_url_scheme: "com.paragon.app",
};

function escapar(texto) {
  const conHuecos = /\{\d+\}/.test(texto);
  let s = texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
  if (conHuecos) s = s.replace(/%/g, "%%").replace(/\{(\d+)\}/g, (_, n) => `%${Number(n) + 1}$s`);
  if (/^[@?]/.test(s)) s = `\\${s}`;
  // Android recorta los espacios de los extremos y junta los dobles: entre comillas se respetan.
  if (/^\s|\s$|\s\s/.test(texto)) s = `"${s}"`;
  return { s, conHuecos };
}

for (const [idioma, carpeta] of Object.entries(IDIOMAS)) {
  const lineas = [
    '<?xml version="1.0" encoding="utf-8"?>',
    "<!-- GENERADO por android/i18n/generar.mjs desde android/i18n/textos.json: no editar a mano. -->",
    "<resources>",
  ];
  if (idioma === "es") {
    for (const [k, v] of Object.entries(FIJOS)) lineas.push(`    <string name="${k}" translatable="false">${v}</string>`);
  }
  for (const clave of Object.keys(textos).sort()) {
    const valor = textos[clave][idioma];
    if (valor == null) throw new Error(`Falta "${idioma}" en ${clave}`);
    const { s, conHuecos } = escapar(valor);
    const formato = !conHuecos && s.includes("%") ? ' formatted="false"' : "";
    lineas.push(`    <string name="${clave}"${formato}>${s}</string>`);
  }
  lineas.push("</resources>", "");
  mkdirSync(join(res, carpeta), { recursive: true });
  writeFileSync(join(res, carpeta, "strings.xml"), lineas.join("\n"));
}
console.log(`${Object.keys(textos).length} textos × 4 idiomas`);
