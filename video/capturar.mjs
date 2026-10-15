// Capturas reales de la web de Paragon para el vídeo (public/capturas/), como
// se ve en un PC (el usuario la prefiere así a la versión de móvil).
// Con la web arrancada en local (npx next start -p 3100) o en producción:
//   BASE=http://localhost:3100 node capturar.mjs
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3100";
const CHROME = process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
mkdirSync("public/capturas", { recursive: true });

const navegador = await chromium.launch({ executablePath: CHROME });
// Una pantalla de portátil: 1280 × 800 a 2x, en modo oscuro. Más estrecha
// que 1440 para que, dentro del vídeo vertical, el texto se lea mejor.
const ANCHO = 1280;
const contexto = await navegador.newContext({
  viewport: { width: ANCHO, height: 800 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
  locale: "es-ES",
});
// Sin el aviso de cookies (es informativo, se recuerda en localStorage).
await contexto.addInitScript(() => localStorage.setItem("platinos:cookies-aceptadas", "1"));

// El perfil de ejemplo usa los mismos componentes que un perfil real y no
// necesita base de datos, así que sale igual en local que en producción.
const pagina = await contexto.newPage();
await pagina.goto(BASE + "/ejemplo", { waitUntil: "networkidle", timeout: 60_000 }).catch(() => {});
// Recorrer la página de arriba abajo: hay bloques que aparecen al entrar en
// pantalla y, sin esto, salían huecos vacíos en la captura entera.
await pagina.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 400) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});
await pagina.waitForTimeout(1500);
// Las carátulas vienen de CDNs externos: si no cargan (sin red), mejor el
// degradado de respaldo de la tarjeta que el icono de imagen rota.
await pagina.evaluate(() => {
  for (const img of document.images) if (!img.complete || img.naturalWidth === 0) img.style.visibility = "hidden";
});
await pagina.screenshot({ path: "public/capturas/perfil-pc.png", fullPage: true });
// Medidas en px de CSS: el vídeo las usa para saber cuánto recorrer.
const alto = await pagina.evaluate(() => document.documentElement.scrollHeight);
writeFileSync("src/medidas.json", JSON.stringify({ perfilPc: { ancho: ANCHO, alto } }, null, 2) + "\n");
console.log("OK perfil-pc.png", ANCHO, alto);
await navegador.close();
