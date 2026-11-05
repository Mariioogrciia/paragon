/**
 * Prueba de humo (5 nov 2026): abre las páginas públicas con un navegador de
 * verdad, en ancho de móvil y de escritorio, y falla si alguna da 5xx, lanza
 * un error de JavaScript o se sale de ancho (scroll horizontal, el fallo de
 * los filtros de la biblioteca en el móvil).
 *
 *   BASE_URL=http://localhost:3000 node tests/humo/humo.mjs
 *
 * En la CI va tras `next build && next start` contra un Postgres vacío.
 */
import { createRequire } from "node:module";

// Con `require` (y no `import`) para que valga también un Playwright global
// por NODE_PATH, como el que viene instalado en las sesiones de Claude.
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const RUTAS = ["/", "/entrar", "/como-funciona", "/ligas", "/ligas/evento", "/apoyar", "/privacidad", "/terminos", "/cookies", "/offline", "/no-existe-esta-pagina"];
const ANCHOS = [{ nombre: "móvil", width: 390, height: 844 }, { nombre: "escritorio", width: 1280, height: 800 }];

const navegador = await chromium.launch();
const fallos = [];
for (const ancho of ANCHOS) {
  const pagina = await navegador.newPage({ viewport: { width: ancho.width, height: ancho.height } });
  const errores = [];
  pagina.on("pageerror", (e) => errores.push(e.message));
  for (const ruta of RUTAS) {
    errores.length = 0;
    const respuesta = await pagina.goto(BASE + ruta, { waitUntil: "networkidle", timeout: 45_000 }).catch((e) => ({ status: () => 0, error: e }));
    const estado = respuesta?.status?.() ?? 0;
    const desborde = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth).catch(() => 0);
    const problemas = [];
    if (estado === 0 || estado >= 500) problemas.push(`HTTP ${estado}`);
    if (desborde > 1) problemas.push(`se sale ${desborde}px de ancho`);
    if (errores.length) problemas.push(`error JS: ${errores[0].slice(0, 160)}`);
    console.log(`${problemas.length ? "✗" : "✓"} [${ancho.nombre}] ${ruta} → ${estado}${problemas.length ? ` (${problemas.join("; ")})` : ""}`);
    if (problemas.length) fallos.push(`${ancho.nombre} ${ruta}: ${problemas.join("; ")}`);
  }
  await pagina.close();
}
await navegador.close();
if (fallos.length) {
  console.error(`\n${fallos.length} fallo(s):\n- ${fallos.join("\n- ")}`);
  process.exit(1);
}
console.log("\nTodo bien.");
