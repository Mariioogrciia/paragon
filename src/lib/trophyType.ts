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

export type TrophyType = "historia" | "coleccionable" | "completista" | "multijugador" | "habilidad" | "secreto";

export const TROPHY_TYPE_LABEL: Record<TrophyType, string> = {
  historia: "Historia",
  coleccionable: "Coleccionable",
  completista: "Completista",
  multijugador: "Multijugador",
  habilidad: "Habilidad",
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
