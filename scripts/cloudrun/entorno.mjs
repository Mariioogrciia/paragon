#!/usr/bin/env node
/**
 * Prepara las variables de entorno para Cloud Run (10 nov 2026) a partir de
 * UN .env (el que saca `vercel env pull`, o el secreto ENV_PRODUCCION de
 * GitHub en el despliegue):
 *
 *   node scripts/cloudrun/entorno.mjs <entrada.env> <salida.env> <salida.yaml>
 *
 * - <salida.env>: para compilar (secreto de BuildKit, ver Dockerfile).
 * - <salida.yaml>: para `gcloud run deploy --env-vars-file`.
 *
 * Fuera las de Vercel (VERCEL=1 haría creer a next.config.ts que compila en
 * Vercel y no saldría el modo standalone) y las que reserva Cloud Run.
 * No imprime ningún valor, solo los nombres.
 */
import { readFileSync, writeFileSync } from "node:fs";
import dotenv from "dotenv";

const [entrada, salidaEnv, salidaYaml] = process.argv.slice(2);
if (!entrada || !salidaEnv || !salidaYaml) {
  console.error("Uso: node scripts/cloudrun/entorno.mjs <entrada.env> <salida.env> <salida.yaml>");
  process.exit(1);
}

const FUERA = [/^VERCEL/, /^TURBO_/, /^NX_/, /^PORT$/, /^K_(SERVICE|REVISION|CONFIGURATION)$/, /^HOSTNAME$/];
// Con dotenv, igual que lee Next los .env: así un JSON con comillas dentro
// (como lo deja `vercel env pull`) sale idéntico.
const todas = dotenv.parse(readFileSync(entrada));
const vars = Object.fromEntries(Object.entries(todas).filter(([k, v]) => v !== "" && !FUERA.some((r) => r.test(k))));

// Imprescindibles fuera de Vercel con Auth.js: confiar en la cabecera Host del
// proxy de Google y saber el dominio público (si no estaban ya).
vars.AUTH_TRUST_HOST ??= "true";
vars.AUTH_URL ??= "https://www.paragontrophies.com";

const faltan = ["DATABASE_URL", "AUTH_SECRET", "CRON_SECRET", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"].filter((k) => !vars[k]);
if (faltan.length > 0) console.warn(`Ojo, faltan: ${faltan.join(", ")}`);

// .env que dotenv (y por tanto Next) vuelve a leer igual: entre comillas
// dobles con los saltos escapados; si el valor lleva comillas dobles, entre
// simples (dotenv no interpreta nada dentro); y si lleva de las dos, acentos graves.
const comillas = (v) =>
  !v.includes('"') ? `"${v.replace(/\n/g, "\\n")}"` : !v.includes("'") ? `'${v}'` : `\`${v}\``;
writeFileSync(salidaEnv, Object.entries(vars).map(([k, v]) => `${k}=${comillas(v)}`).join("\n") + "\n");
// YAML: JSON es YAML válido, y así cualquier valor (JSON de Firebase incluido) va bien escapado.
writeFileSync(salidaYaml, Object.entries(vars).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("\n") + "\n");

console.log(`${Object.keys(vars).length} variables: ${Object.keys(vars).sort().join(", ")}`);
