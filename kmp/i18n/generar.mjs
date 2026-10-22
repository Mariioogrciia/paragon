// Genera los textos de la app móvil a partir de textos.json (una sola fuente
// con los 6 idiomas: es por defecto, en, de, fr, it, pt — los mismos que la web):
//   1. kmp/shared/.../i18n/TextosGenerados.kt — código común (Android e iOS):
//      stringResource(T.clave, a, b) en Compose / Textos.t(T.clave, a, b) fuera.
//   2. kmp/androidApp/src/main/res/values*/strings.xml — para el código de
//      Android que aún no se ha movido a :shared (R.string.clave).
// Uso: node kmp/i18n/generar.mjs   (desde la raíz del repo)
//
// En textos.json los huecos se escriben {0}, {1}...; en strings.xml pasan a
// %1$s, %2$s; en Kotlin se quedan como {0} y los rellena Textos.t.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const textos = JSON.parse(readFileSync(join(aqui, "textos.json"), "utf8"));
const claves = Object.keys(textos).sort();
const IDIOMAS = ["es", "en", "de", "fr", "it", "pt"];

// Los huecos {0}, {1}... de cada idioma tienen que ser los mismos que en
// español (21 oct 2026): uno perdido en una traducción no daba ningún error,
// solo un texto sin el dato; uno de más salía tal cual, "{1}", en pantalla.
const huecos = (texto) => [...new Set(texto.match(/\{\d+\}/g) ?? [])].sort().join(",");
const errores = [];
for (const clave of claves) {
  for (const idioma of IDIOMAS) {
    if (textos[clave][idioma] == null) errores.push(`Falta "${idioma}" en ${clave}`);
    else if (huecos(textos[clave][idioma]) !== huecos(textos[clave].es)) {
      errores.push(`Huecos distintos en ${clave} (${idioma}): "${huecos(textos[clave][idioma])}" frente a "${huecos(textos[clave].es)}" en español`);
    }
  }
  if (!/^[a-z][a-z0-9_]*$/.test(clave)) errores.push(`Clave no válida en Kotlin/Android: ${clave}`);
}
if (errores.length > 0) throw new Error(errores.join("\n"));

// --- 1. Kotlin común -------------------------------------------------------

function literalKotlin(texto) {
  return (
    '"' +
    texto
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\$/g, "\\$")
      .replace(/\n/g, "\\n") +
    '"'
  );
}

const kt = [
  "// GENERADO por kmp/i18n/generar.mjs desde kmp/i18n/textos.json: no editar a mano.",
  "@file:Suppress(\"ObjectPropertyName\", \"unused\")",
  "",
  "package com.paragon.shared.i18n",
  "",
  "/** Un texto traducible; se pinta con `stringResource(T.clave)` o `Textos.t(T.clave)`. */",
  "class Texto internal constructor(internal val indice: Int)",
  "",
  "object T {",
  ...claves.map((c, i) => `    val ${c} = Texto(${i})`),
  "}",
  "",
];
for (const idioma of IDIOMAS) {
  // Una función por idioma (y no una propiedad): el array solo se crea al
  // usar ese idioma, y cada función queda lejos del límite de 64 KB de la JVM.
  kt.push(`internal fun textos${idioma.toUpperCase()}(): Array<String> = arrayOf(`);
  for (const c of claves) kt.push(`    ${literalKotlin(textos[c][idioma])},`);
  kt.push(")", "");
}
const rutaKt = join(aqui, "..", "shared", "src", "commonMain", "kotlin", "com", "paragon", "shared", "i18n");
mkdirSync(rutaKt, { recursive: true });
writeFileSync(join(rutaKt, "TextosGenerados.kt"), kt.join("\n"));

// --- 2. strings.xml de Android ---------------------------------------------

const res = join(aqui, "..", "androidApp", "src", "main", "res");
const CARPETAS = { es: "values", en: "values-en", de: "values-de", fr: "values-fr", it: "values-it", pt: "values-pt" };
const FIJOS = { app_name: "Paragon", title_activity_main: "Paragon" };

function escaparXml(texto) {
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

for (const [idioma, carpeta] of Object.entries(CARPETAS)) {
  const lineas = [
    '<?xml version="1.0" encoding="utf-8"?>',
    "<!-- GENERADO por kmp/i18n/generar.mjs desde kmp/i18n/textos.json: no editar a mano. -->",
    "<resources>",
  ];
  if (idioma === "es") {
    for (const [k, v] of Object.entries(FIJOS)) lineas.push(`    <string name="${k}" translatable="false">${v}</string>`);
  }
  for (const clave of claves) {
    const { s, conHuecos } = escaparXml(textos[clave][idioma]);
    const formato = !conHuecos && s.includes("%") ? ' formatted="false"' : "";
    lineas.push(`    <string name="${clave}"${formato}>${s}</string>`);
  }
  lineas.push("</resources>", "");
  mkdirSync(join(res, carpeta), { recursive: true });
  writeFileSync(join(res, carpeta, "strings.xml"), lineas.join("\n"));
}

console.log(`${claves.length} textos × ${IDIOMAS.length} idiomas`);
