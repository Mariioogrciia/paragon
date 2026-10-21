// Gráficos de la ficha de Google Play (16 oct 2026), en ../kmp/play/graficos/:
// - icono-512.png: el icono de la tienda (512 × 512).
// - <idioma>/destacado.png: el "gráfico de funciones" (1024 × 500).
// - <idioma>/telefono-N.png: capturas del móvil (1080 × 1920) con un rótulo
//   encima. Google Play no acepta una captura más del doble de alta que de
//   ancha, y las del móvil son 923 × 2000: por eso van dentro de un marco.
// Las capturas son las reales de la app (public/capturas/app-*.jpg). Para
// rehacerlo: `npm run graficos-play` dentro de video/.
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync } from "node:fs";

const CHROME = process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SALIDA = "../kmp/play/graficos";

const datos = (ruta, tipo) => `data:${tipo};base64,${readFileSync(ruta).toString("base64")}`;
const fuente = (familia, peso, archivo) =>
  `@font-face{font-family:"${familia}";font-weight:${peso};src:url(${datos(`public/fuentes/${archivo}`, "font/woff2")}) format("woff2")}`;
const FUENTES = [
  fuente("Chakra Petch", 700, "chakra-700.woff2"),
  fuente("Barlow", 400, "barlow-400.woff2"),
  fuente("Barlow", 600, "barlow-600.woff2"),
].join("");
const LOGO = datos("public/logo.png", "image/png");
const CAPTURAS = [datos("public/capturas/app-ficha-diario.jpg", "image/jpeg"), datos("public/capturas/app-grafica-platino.jpg", "image/jpeg")];

const TEXTOS = {
  "es-ES": {
    lema: "Todos tus trofeos en un sitio",
    plataformas: "PlayStation · Steam · Xbox",
    capturas: [
      ["El diario de cada platino", "Cuándo sacaste cada trofeo y cuánto te costó"],
      ["Tu progreso, trofeo a trofeo", "La gráfica del platino, día a día"],
    ],
  },
  "en-US": {
    lema: "All your trophies in one place",
    plataformas: "PlayStation · Steam · Xbox",
    capturas: [
      ["A diary for every platinum", "When you earned each trophy and how long it took"],
      ["Your progress, trophy by trophy", "Your platinum chart, day by day"],
    ],
  },
  "de-DE": {
    lema: "Alle deine Trophäen an einem Ort",
    plataformas: "PlayStation · Steam · Xbox",
    capturas: [
      ["Ein Tagebuch für jedes Platin", "Wann du jede Trophäe geholt hast und wie lange es dauerte"],
      ["Dein Fortschritt, Trophäe für Trophäe", "Dein Platin-Verlauf, Tag für Tag"],
    ],
  },
  "fr-FR": {
    lema: "Tous tes trophées au même endroit",
    plataformas: "PlayStation · Steam · Xbox",
    capturas: [
      ["Le journal de chaque platine", "Quand tu as eu chaque trophée et combien de temps ça a pris"],
      ["Ta progression, trophée par trophée", "La courbe de ton platine, jour après jour"],
    ],
  },
  "it-IT": {
    lema: "Tutti i tuoi trofei in un posto",
    plataformas: "PlayStation · Steam · Xbox",
    capturas: [
      ["Il diario di ogni platino", "Quando hai ottenuto ogni trofeo e quanto ti è costato"],
      ["I tuoi progressi, trofeo dopo trofeo", "Il grafico del platino, giorno per giorno"],
    ],
  },
  "pt-PT": {
    lema: "Todos os teus troféus num só sítio",
    plataformas: "PlayStation · Steam · Xbox",
    capturas: [
      ["O diário de cada platina", "Quando conquistaste cada troféu e quanto te custou"],
      ["O teu progresso, troféu a troféu", "O gráfico da platina, dia a dia"],
    ],
  },
};

const BASE = `<style>${FUENTES}*{margin:0;box-sizing:border-box}body{background:#0a0d13;color:#fff;font-family:Barlow,sans-serif;overflow:hidden}
.fondo{position:absolute;inset:0;background:radial-gradient(900px 600px at 80% 0%,rgba(124,196,228,.28),transparent 60%),radial-gradient(700px 500px at 0% 100%,rgba(159,212,236,.16),transparent 60%),linear-gradient(160deg,#0d1420,#0a0d13 60%,#07090d)}
h1,.marca{font-family:"Chakra Petch",sans-serif;font-weight:700}</style>`;

const icono = `${BASE}<body style="width:512px;height:512px"><div class="fondo"></div>
<img src="${LOGO}" style="position:absolute;left:76px;top:76px;width:360px;height:360px"></body>`;

const destacado = (t) => `${BASE}<body style="width:1024px;height:500px"><div class="fondo"></div>
<div style="position:absolute;inset:0;display:flex;align-items:center;gap:48px;padding:0 72px">
<img src="${LOGO}" style="width:220px;height:220px;flex-shrink:0">
<div><div class="marca" style="font-size:72px;letter-spacing:10px">PARAGON</div>
<h1 style="font-size:44px;line-height:1.1;margin-top:10px;color:#d7eef8">${t.lema}</h1>
<p style="font-size:28px;margin-top:18px;color:#8b93a7;font-weight:600">${t.plataformas}</p></div></div></body>`;

const telefono = (titulo, subtitulo, captura) => `${BASE}<body style="width:1080px;height:1920px"><div class="fondo"></div>
<div style="position:absolute;top:120px;left:80px;right:80px;text-align:center">
<h1 style="font-size:76px;line-height:1.05">${titulo}</h1>
<p style="font-size:40px;margin-top:24px;color:#a9b6c8;font-weight:600">${subtitulo}</p></div>
<div style="position:absolute;left:50%;top:520px;transform:translateX(-50%);width:640px;height:1387px;border-radius:72px;padding:18px;background:#1a2230;box-shadow:0 60px 140px rgba(0,0,0,.7),0 0 0 2px rgba(255,255,255,.08)">
<img src="${captura}" style="width:100%;height:100%;object-fit:cover;object-position:top;border-radius:56px"></div></body>`;

const navegador = await chromium.launch({ executablePath: CHROME });
async function foto(html, ancho, alto, ruta) {
  const pagina = await navegador.newPage({ viewport: { width: ancho, height: alto } });
  await pagina.setContent(html, { waitUntil: "load" });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.screenshot({ path: ruta, omitBackground: false });
  await pagina.close();
}

mkdirSync(SALIDA, { recursive: true });
await foto(icono, 512, 512, `${SALIDA}/icono-512.png`);
for (const [idioma, t] of Object.entries(TEXTOS)) {
  mkdirSync(`${SALIDA}/${idioma}`, { recursive: true });
  await foto(destacado(t), 1024, 500, `${SALIDA}/${idioma}/destacado.png`);
  for (const [i, [titulo, subtitulo]] of t.capturas.entries()) {
    await foto(telefono(titulo, subtitulo, CAPTURAS[i]), 1080, 1920, `${SALIDA}/${idioma}/telefono-${i + 1}.png`);
  }
}
await navegador.close();
console.log(`Listo: ${SALIDA}`);
