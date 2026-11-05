/**
 * Textos y formatos puros de las herramientas para streamers y webs ajenas
 * (`/api/texto`, `/api/insignia`, overlay de OBS). Sin `server-only`: se
 * prueban sueltos en `tests/streamerTexto.test.ts`.
 *
 * Los textos van aquí y no en `messages/` porque no los pinta ninguna página
 * de la web: los lee Nightbot en un chat de Twitch, o una imagen SVG en un
 * README. Mismo motivo que `lib/textosDiscord.ts`.
 */
import type { Idioma } from "@/lib/idiomasTrofeo";

export interface ResumenStreamer {
  handle: string;
  nombre: string;
  nivel: number;
  platinos: number;
  trofeos: number;
  juegos: number;
  completado: number;
  actual: { titulo: string; ganados: number; total: number; porcentaje: number; iconUrl: string | null } | null;
  ultimo: { nombre: string; juego: string; grado: string | null; earnedAt: string; iconUrl: string | null } | null;
}

/** Qué dato suelto pide un comando de chat (`?dato=`). */
export const DATOS = ["todo", "nivel", "platinos", "juego", "ultimo"] as const;
export type Dato = (typeof DATOS)[number];

export function esDato(valor: unknown): valor is Dato {
  return typeof valor === "string" && (DATOS as readonly string[]).includes(valor);
}

const TEXTOS: Record<
  Idioma,
  {
    nivel: string;
    platinos: string;
    trofeos: string;
    cazando: string;
    ultimo: string;
    sinJuego: string;
    sinTrofeos: string;
    noExiste: string;
    desbloqueado: string;
  }
> = {
  es: { nivel: "Nivel", platinos: "platinos", trofeos: "trofeos", cazando: "cazando", ultimo: "Último trofeo", sinJuego: "sin juego en marcha", sinTrofeos: "todavía sin trofeos", noExiste: "No existe ese perfil de Paragon.", desbloqueado: "¡Trofeo desbloqueado!" },
  en: { nivel: "Level", platinos: "platinums", trofeos: "trophies", cazando: "hunting", ultimo: "Latest trophy", sinJuego: "no game in progress", sinTrofeos: "no trophies yet", noExiste: "That Paragon profile doesn't exist.", desbloqueado: "Trophy unlocked!" },
  de: { nivel: "Stufe", platinos: "Platin", trofeos: "Trophäen", cazando: "jagt", ultimo: "Letzte Trophäe", sinJuego: "kein aktives Spiel", sinTrofeos: "noch keine Trophäen", noExiste: "Dieses Paragon-Profil gibt es nicht.", desbloqueado: "Trophäe freigeschaltet!" },
  fr: { nivel: "Niveau", platinos: "platines", trofeos: "trophées", cazando: "chasse", ultimo: "Dernier trophée", sinJuego: "aucun jeu en cours", sinTrofeos: "pas encore de trophées", noExiste: "Ce profil Paragon n'existe pas.", desbloqueado: "Trophée débloqué !" },
  it: { nivel: "Livello", platinos: "platini", trofeos: "trofei", cazando: "a caccia su", ultimo: "Ultimo trofeo", sinJuego: "nessun gioco in corso", sinTrofeos: "ancora nessun trofeo", noExiste: "Questo profilo Paragon non esiste.", desbloqueado: "Trofeo sbloccato!" },
  pt: { nivel: "Nível", platinos: "platinas", trofeos: "troféus", cazando: "a caçar", ultimo: "Último troféu", sinJuego: "nenhum jogo em curso", sinTrofeos: "ainda sem troféus", noExiste: "Esse perfil Paragon não existe.", desbloqueado: "Troféu desbloqueado!" },
};

/** Etiquetas del overlay de OBS. */
export function textosOverlay(idioma: Idioma) {
  const t = TEXTOS[idioma];
  return { trofeos: t.trofeos, ultimo: t.ultimo, desbloqueado: t.desbloqueado };
}

export function textoNoExiste(idioma: Idioma): string {
  return TEXTOS[idioma].noExiste;
}

/** Separador de miles en el idioma pedido (Nightbot no entiende de locales). */
function numero(n: number, idioma: Idioma): string {
  return n.toLocaleString(idioma === "en" ? "en-US" : idioma);
}

/**
 * Una línea de texto plano para un comando de chat. Twitch corta los
 * mensajes a 500 caracteres: el título del juego se recorta para no pasarse.
 */
export function textoChat(r: ResumenStreamer, idioma: Idioma, dato: Dato = "todo"): string {
  const t = TEXTOS[idioma];
  const nivel = `${t.nivel} ${r.nivel}`;
  const platinos = `${numero(r.platinos, idioma)} ${t.platinos}`;
  const juego = r.actual
    ? `${t.cazando} ${recortar(r.actual.titulo, 80)} (${r.actual.porcentaje}%)`
    : t.sinJuego;
  const ultimo = r.ultimo ? `${t.ultimo}: ${recortar(r.ultimo.nombre, 80)} · ${recortar(r.ultimo.juego, 60)}` : t.sinTrofeos;

  switch (dato) {
    case "nivel":
      return `@${r.handle} · ${nivel}`;
    case "platinos":
      return `@${r.handle} · ${platinos} · ${numero(r.trofeos, idioma)} ${t.trofeos}`;
    case "juego":
      return `@${r.handle} · ${juego}`;
    case "ultimo":
      return `@${r.handle} · ${ultimo}`;
    default:
      return recortar(`@${r.handle} · ${nivel} · ${platinos} · ${juego} · ${ultimo}`, 480);
  }
}

function recortar(texto: string, maximo: number): string {
  return texto.length <= maximo ? texto : `${texto.slice(0, maximo - 1).trimEnd()}…`;
}

const escaparXml = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

/**
 * Ancho aproximado de un texto en Verdana 11px, como hacen shields.io y
 * compañía: no hay forma de medir fuentes en el servidor sin cargar una, y
 * una aproximación por carácter basta para que la pastilla no se corte.
 */
function anchoTexto(texto: string): number {
  let ancho = 0;
  for (const c of texto) {
    if ("il.,:;|!'".includes(c)) ancho += 3.5;
    else if ("mwMW@".includes(c)) ancho += 10;
    else if (c === " ") ancho += 3.7;
    else if (c >= "A" && c <= "Z") ancho += 7.8;
    else ancho += 6.6;
  }
  return Math.ceil(ancho);
}

/**
 * Insignia SVG estilo shields.io («Paragon | Nv. 42 · 87 🏆»). Texto puro:
 * no pasa por satori como la firma PNG, así que cuesta una fracción de CPU.
 */
export function insigniaSvg(r: Pick<ResumenStreamer, "nivel" | "platinos">, idioma: Idioma, estilo: "plano" | "cuadrado" = "plano"): string {
  const izquierda = "Paragon";
  const derecha = `${TEXTOS[idioma].nivel} ${r.nivel} · ${numero(r.platinos, idioma)} ${TEXTOS[idioma].platinos}`;
  const anchoIzq = anchoTexto(izquierda) + 20;
  const anchoDer = anchoTexto(derecha) + 20;
  const ancho = anchoIzq + anchoDer;
  const radio = estilo === "cuadrado" ? 0 : 4;
  const etiqueta = escaparXml(`${izquierda}: ${derecha}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="20" role="img" aria-label="${etiqueta}">
<title>${etiqueta}</title>
<linearGradient id="b" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="r"><rect width="${ancho}" height="20" rx="${radio}" fill="#fff"/></clipPath>
<g clip-path="url(#r)">
<rect width="${anchoIzq}" height="20" fill="#0a0f18"/>
<rect x="${anchoIzq}" width="${anchoDer}" height="20" fill="#7fbcd8"/>
<rect width="${ancho}" height="20" fill="url(#b)"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
<text x="${anchoIzq / 2}" y="14">${escaparXml(izquierda)}</text>
<text x="${anchoIzq + anchoDer / 2}" y="14" fill="#061021" font-weight="bold">${escaparXml(derecha)}</text>
</g>
</svg>`;
}
