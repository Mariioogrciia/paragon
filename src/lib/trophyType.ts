/**
 * Categoría aproximada de un trofeo (historia, coleccionable, completista,
 * secreto, multijugador, habilidad) — ninguna API de PSN ni de Steam expone
 * esto, así que se infiere a partir del nombre y la descripción del propio
 * trofeo (que en la base están casi siempre en inglés, el idioma original de
 * la tienda) con una lista de palabras clave. Es una aproximación, igual que
 * la dificultad estimada por rareza (lib/community.ts): no se pretende que
 * acierte siempre, y por eso solo se enseña un icono cuando hay una
 * coincidencia clara — sin coincidencia, no se muestra nada en vez de
 * adivinar. "Secreto" es la única categoría que no es heurística: sale
 * directo del campo `hidden`, que sí es un dato real de la plataforma.
 */

export type TrophyType = "historia" | "coleccionable" | "completista" | "multijugador" | "habilidad" | "grindeo" | "secreto";

export const TROPHY_TYPE_LABEL: Record<TrophyType, string> = {
  historia: "Historia",
  coleccionable: "Coleccionable",
  completista: "Completista",
  multijugador: "Multijugador",
  habilidad: "Habilidad",
  grindeo: "Grindeo",
  secreto: "Secreto",
};

// Orden de prioridad: si un trofeo coincide con varias, se queda la primera
// de esta lista. "Secreto" se decide aparte, a partir de `hidden`.
const REGLAS: { tipo: Exclude<TrophyType, "secreto">; patron: RegExp }[] = [
  {
    tipo: "completista",
    patron:
      /\b(100 ?%|master(ed)?|all (achievements|trophies)|every (level|mission|chapter)|domin[ao]|complet[ao] (el juego|todos)|platinum)\b/i,
  },
  {
    // Verbo de acumular/repetir + un número grande — "kill 1000 enemies",
    // "reach level 50", "earn 1,000,000 gold". Va ANTES que "coleccionable"
    // a propósito: "collect 1000 coins" es grindeo, no la misma "busca los
    // 10 coleccionables del mapa" que sí importa avisar aparte. El número
    // grande es la señal real — sin él, "collect all fragments" (sin
    // cifra) sigue cayendo en coleccionable más abajo, que es lo correcto.
    tipo: "grindeo",
    patron:
      /\b(kill|defeat|earn|collect|obtain|acquire|accumulate|deal|win|play) \D{0,10}(\d{3,}|\d{1,3}(,\d{3})+)\b|\breach level \d{2,}\b|\bnivel \d{2,}\b|\bacumula\w*\b|\b(derrota|mata|consigue|gana|obt[eé]n) a? ?(\d{3,}|\d{1,3}(\.\d{3})+)\b/i,
  },
  {
    tipo: "coleccionable",
    patron:
      /\b(collect(ible)?s?|find all|locate all|scattered|hidden (items|caches)|colecciona|encuentra todos|recolect\w*)\b/i,
  },
  {
    tipo: "historia",
    patron: /\b(story|campaign|chapter \d|prologue|epilogue|final mission|historia|campaña|capítulo)\b/i,
  },
  {
    tipo: "multijugador",
    patron: /\b(multiplayer|online match|co-?op|versus|pvp|ranked|multijugador|en línea)\b/i,
  },
  {
    tipo: "habilidad",
    patron:
      /\b(without (dying|taking damage)|no damage|speedrun|under \d+ (minutes|seconds)|hardest difficulty|nightmare|sin morir|sin recibir daño|modo difícil|veterano)\b/i,
  },
];

/**
 * Clasifica un trofeo. Devuelve `null` cuando no hay coincidencia clara — es
 * el caso más común (la mayoría de trofeos no dan pistas de categoría en su
 * texto), y es preferible a forzar una etiqueta.
 */
export function clasificarTrofeo(trophy: { name: string; detail: string; hidden?: boolean }): TrophyType | null {
  if (trophy.hidden) return "secreto";

  const texto = `${trophy.name} ${trophy.detail}`;
  for (const { tipo, patron } of REGLAS) {
    if (patron.test(texto)) return tipo;
  }
  return null;
}

/*
 * ¿Es un trofeo perdible? Ya NO vive aquí — ver lib/powerpyx.ts.
 *
 * Se probaron aquí dos heurísticas de texto sobre el propio nombre y
 * descripción del trofeo, y las dos fallaron por la misma razón de fondo:
 * comprobado contra los 15.574 trofeos reales de la base, la descripción
 * que da PSN/Steam de un trofeo NUNCA avisa de si es perdible (0 contienen
 * la palabra "missable", y las pocas coincidencias con patrones más amplios
 * eran nombres de misión que casualmente sonaban a aviso — "Point of No
 * Return" como título de nivel, no una advertencia real). A diferencia de
 * `clasificarTrofeo` de aquí arriba, no había ninguna aproximación honesta
 * posible con ESE dato: no es que acertara poco, es que la información no
 * está ahí en absoluto.
 *
 * La fuente real es PowerPyx (una guía escrita por una persona), con su
 * propia normalización y emparejamiento por nombre — ver el comentario
 * largo en lib/powerpyx.ts.
 */
