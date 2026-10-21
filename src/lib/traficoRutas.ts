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
