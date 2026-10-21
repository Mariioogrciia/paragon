/**
 * Las reglas del contador de tráfico propio (lib/trafico.ts), aparte y sin
 * base de datos para poder probarlas. Agrupan cada URL en su "tipo de
 * página" (`/u/fende21` y `/u/otro` cuentan juntos como `/u/[handle]`): así
 * el panel dice qué partes de Paragon se usan sin guardar a quién se mira, y
 * la tabla no crece con una fila por perfil o por juego.
 */

/** Lo que no se cuenta: el propio panel, la API, los flujos de login de la app y los archivos. */
const IGNORAR = /^\/(api|admin|_next|movil)(\/|$)/;

const PATRONES: [RegExp, string][] = [
  [/^\/u\/[^/]+\/wrap(\/.*)?$/, "/u/[handle]/wrap"],
  [/^\/u\/[^/]+\/(biblioteca|estadisticas|cv)$/, "/u/[handle]/$1"],
  [/^\/u\/[^/]+\/[^/]+$/, "/u/[handle]/[juego]"],
  [/^\/u\/[^/]+$/, "/u/[handle]"],
  [/^\/juego\/[^/]+$/, "/juego/[id]"],
  [/^\/clanes\/[^/]+$/, "/clanes/[tag]"],
  [/^\/ligas\/[^/]+$/, "/ligas/[id]"],
  [/^\/comparar\/[^/]+$/, "/comparar/[handle]"],
  [/^\/esports\/partido\/[^/]+$/, "/esports/partido/[id]"],
  [/^\/sesiones\/[^/]+$/, "/sesiones/[id]"],
];

/** La ruta agrupada, o null si no se cuenta. */
export function normalizarRuta(ruta: string): string | null {
  let r = ruta.split(/[?#]/)[0] ?? "";
  if (!r.startsWith("/") || r.length > 300) return null;
  if (r.length > 1) r = r.replace(/\/+$/, "");
  if (IGNORAR.test(r) || /\.[a-z0-9]{2,5}$/i.test(r)) return null;
  for (const [re, grupo] of PATRONES) if (re.test(r)) return r.replace(re, grupo);
  // El resto son páginas fijas (/descubrir/steam, /ajustes/avisos...): tal cual, con tope.
  return r.split("/").slice(0, 4).join("/").slice(0, 80);
}

/** Dominios propios: una visita que viene de aquí no es una entrada nueva. */
const PROPIOS = /(^|\.)paragontrophies\.com$|^platinos-nine\.vercel\.app$|^localhost$/;

/**
 * De dónde llega una entrada: el dominio del referrer sin "www.", "directo"
 * si no hay (escrito a mano, marcadores, apps) o null si viene de la propia web.
 */
export function origenDe(referrer: string | null | undefined): string | null {
  if (!referrer) return "directo";
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "directo";
  }
  if (PROPIOS.test(host)) return null;
  return host.replace(/^www\./, "").slice(0, 60);
}

/** Rastreadores y bots: no son visitas de personas. */
export function esBot(ua: string | null | undefined): boolean {
  return !ua || /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|curl|wget|python|axios|node-fetch/i.test(ua);
}

export function esMovil(ua: string | null | undefined): boolean {
  return !!ua && /mobile|android|iphone|ipad/i.test(ua);
}

/* ---- Dimensiones de la visita (22 oct 2026) ----
 * Lo que Admin → Analítica enseña en tartas y barras: todo se reduce a una
 * etiqueta corta de una lista cerrada antes de guardarse (nunca el
 * User-Agent ni el idioma tal cual), así no hay nada que identifique a nadie
 * y las tablas no crecen sin control. */

/** El navegador, por familia. El orden importa: Edge y Opera dicen también "Chrome". */
export function navegadorDe(ua: string | null | undefined): string {
  if (!ua) return "Otro";
  if (/edg(e|a|ios)?\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/chrome|crios|chromium/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Otro";
}

export function sistemaDe(ua: string | null | undefined): string {
  if (!ua) return "Otro";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/cros/i.test(ua)) return "ChromeOS";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Otro";
}

export function dispositivoDe(ua: string | null | undefined): "movil" | "tablet" | "escritorio" {
  if (!ua) return "escritorio";
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android/i.test(ua)) return "movil";
  return "escritorio";
}

const BOTS: [RegExp, string][] = [
  [/googlebot|google-inspectiontool|adsbot-google|mediapartners-google|google-site-verification/i, "Google"],
  [/bingbot|bingpreview|msnbot/i, "Bing"],
  [/applebot/i, "Apple"],
  [/yandex/i, "Yandex"],
  [/duckduckbot|duckassist/i, "DuckDuckGo"],
  [/baiduspider/i, "Baidu"],
  [/facebookexternalhit|meta-externalagent|facebot/i, "Meta"],
  [/twitterbot/i, "X / Twitter"],
  [/discordbot/i, "Discord"],
  [/telegrambot|whatsapp|slackbot/i, "Mensajería"],
  [/gptbot|chatgpt|oai-searchbot|claudebot|anthropic|perplexity|ccbot|bytespider|amazonbot/i, "IA"],
  [/ahrefs|semrush|mj12bot|dotbot|dataforseo|seznam|petalbot/i, "SEO"],
  [/headless|lighthouse|pagespeed|pingdom|uptime|monitor/i, "Monitores y pruebas"],
  [/curl|wget|python|axios|node-fetch|go-http|java\//i, "Scripts"],
];

/** Qué tipo de bot es (para contar los descartados, no se guarda nada más). */
export function nombreBot(ua: string | null | undefined): string {
  if (!ua) return "Sin identificar";
  for (const [re, nombre] of BOTS) if (re.test(ua)) return nombre;
  return "Otros bots";
}

/** "es-ES" → "es". Solo dos letras; lo raro, "otro". */
export function idiomaDe(lang: unknown): string {
  if (typeof lang !== "string") return "otro";
  const base = lang.slice(0, 2).toLowerCase();
  return /^[a-z]{2}$/.test(base) ? base : "otro";
}

/** Ancho de pantalla por tramos, como los puntos de corte de la web. */
export function pantallaDe(ancho: unknown): string | null {
  if (typeof ancho !== "number" || !Number.isFinite(ancho) || ancho <= 0) return null;
  if (ancho < 640) return "< 640";
  if (ancho < 1024) return "640–1023";
  if (ancho < 1440) return "1024–1439";
  if (ancho < 1920) return "1440–1919";
  return "≥ 1920";
}

/** utm_source de la campaña, en minúsculas y con tope; null si no hay. */
export function campanaDe(utm: unknown): string | null {
  if (typeof utm !== "string") return null;
  const limpio = utm.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40);
  return limpio || null;
}

/** País de la cabecera de Vercel (dos letras), o null. */
export function paisDe(cabecera: string | null | undefined): string | null {
  return cabecera && /^[A-Z]{2}$/.test(cabecera) && cabecera !== "XX" ? cabecera : null;
}

export const METRICAS_WEB_VITALS = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const;
export type MetricaWebVitals = (typeof METRICAS_WEB_VITALS)[number];
