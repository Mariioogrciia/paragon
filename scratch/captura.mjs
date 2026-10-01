// node scratch/captura.mjs <url> <ancho> <alto> <salida.png> [full] [sinCookies]
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const [url, ancho, alto, salida, full, sinCookies] = process.argv.slice(2);
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const puerto = 9333;
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${puerto}`, "--user-data-dir=" + process.env.TEMP + "/captura-chrome", "about:blank"], { stdio: "ignore" });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

let info;
for (let i = 0; i < 40 && !info; i++) {
  await espera(250);
  try { info = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json(); } catch {}
}
const pagina = info.find((t) => t.type === "page");
const ws = new WebSocket(pagina.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pendientes = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)(m); pendientes.delete(m.id); }
});
const cdp = (method, params = {}) => new Promise((r) => { const n = ++id; pendientes.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });

const w = Number(ancho), h = Number(alto);
await cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
if (w < 768) await cdp("Emulation.setTouchEmulationEnabled", { enabled: true });
await cdp("Page.enable");
await cdp("Page.navigate", { url });
await espera(5000);
if (sinCookies === "1") {
  await cdp("Runtime.evaluate", { expression: `[...document.querySelectorAll('button')].find(b=>/Entendido|Got it|Verstanden|Compris/.test(b.textContent))?.click()` });
}
// Recorre la página para que se disparen las animaciones de entrada y déjalas asentarse.
await cdp("Runtime.evaluate", { awaitPromise: true, expression: `(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=400){scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}scrollTo(0,0);await new Promise(r=>setTimeout(r,2500))})()` });
const medidas = (await cdp("Runtime.evaluate", { returnByValue: true, expression: `({alto:document.documentElement.scrollHeight, scrollW:document.documentElement.scrollWidth, innerW: innerWidth})` })).result.result.value;
const params = { format: "png", captureBeyondViewport: full === "1" };
if (full === "1") params.clip = { x: 0, y: 0, width: w, height: medidas.alto, scale: 1 };
const shot = await cdp("Page.captureScreenshot", params);
writeFileSync(salida, Buffer.from(shot.result.data, "base64"));
console.log(JSON.stringify({ salida, ...medidas }));
ws.close();
chrome.kill();
process.exit(0);
