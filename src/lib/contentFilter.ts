import "server-only";

/**
 * Filtro de lenguaje ofensivo para todo texto libre que un usuario pueda
 * escribir y que otros vayan a ver: reseñas, notas, nombre para mostrar,
 * título de perfil, estado, nombres de carpeta/liga, guías...
 *
 * A propósito es una lista local, no un servicio de terceros: no hay
 * presupuesto para una API de moderación en un proyecto de este tamaño, y una
 * lista de palabras cubre el caso real (insultos sueltos), no intentos
 * sofisticados de saltársela — eso ya sería otro proyecto.
 *
 * Cubre español e inglés, que es lo que se escribe de verdad en esta app.
 * Alemán/francés quedan fuera por ahora (la interfaz está traducida, pero
 * nadie ha escrito contenido libre en esos idiomas todavía) — si hace falta,
 * se amplía esta misma lista.
 */
const PALABRAS_PROHIBIDAS = [
  // Español — insultos y palabrotas comunes
  "gilipollas", "gilipoyas", "capullo", "cabron", "cabrona", "cabrones",
  "hijo de puta", "hijoputa", "hijos de puta", "hdp",
  "puta", "puto", "putas", "putos", "puton",
  "zorra", "zorras", "maricon", "mariconazo", "marica",
  "subnormal", "retrasado", "retrasada", "mongolo", "mongola",
  "polla", "pollas", "coño", "cono", "gilipollez",
  "mierda", "mierdas", "mamon", "mamona", "mamahuevo",
  "chupapollas", "come mierda", "comemierda",
  "negro de mierda", "sudaca", "gitano de mierda",

  // Inglés — insultos y palabrotas comunes
  "fuck", "fucking", "fucker", "motherfucker", "fuckface",
  "shit", "bullshit", "asshole", "ass hole", "dumbass",
  "bitch", "bitches", "bastard", "bastards",
  "cunt", "cock", "dick", "dickhead", "prick",
  "faggot", "fag", "retard", "retarded",
  "nigger", "nigga", "spic", "chink", "kike",
  "whore", "slut", "slutty",
];

/**
 * Normaliza (minúsculas, sin acentos) y comprueba coincidencias por palabra
 * completa — así "clase" no salta por contener "as" ni nada parecido.
 * Se construye una sola vez, no en cada llamada.
 */
const PATRONES = PALABRAS_PROHIBIDAS.map((palabra) => {
  const escapada = palabra.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Espacios internos (p. ej. "hijo de puta") ya funcionan tal cual con \b
  // al principio y al final de la frase completa.
  return new RegExp(`\\b${escapada}\\b`, "i");
});

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // quita acentos: "coño" y "cono" caen igual
}

/**
 * Coincide por PALABRA completa (con `\b`), a propósito: así "clase" no
 * salta por "as" ni "cockpit" por "cock". El precio es que en un texto SIN
 * espacios (un @handle, p. ej. "putomario") una palabra ofensiva pegada a
 * otras letras puede colarse — aceptable para una lista local como esta,
 * frente al riesgo contrario de bloquear palabras normales por casualidad.
 */
/** `true` si el texto contiene lenguaje ofensivo detectable. */
export function contieneLenguajeOfensivo(texto: string): boolean {
  if (!texto.trim()) return false;
  const normalizado = normalizar(texto);
  return PATRONES.some((patron) => patron.test(normalizado));
}

/**
 * Para usar directo en una server action: si el texto es ofensivo, devuelve
 * el mensaje de error listo para `ActionState`; si no, `null`.
 */
export function errorSiOfensivo(texto: string): string | null {
  return contieneLenguajeOfensivo(texto)
    ? "Ese texto no se puede publicar — contiene lenguaje ofensivo. Cámbialo e inténtalo de nuevo."
    : null;
}
