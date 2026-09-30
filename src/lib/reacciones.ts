/** Reacciones del feed de Comunidad (una por persona y publicación). Sin base de datos: sirve en cualquier componente. */
export const REACCIONES = [
  { clave: "aplauso", emoji: "👏" },
  { clave: "fuego", emoji: "🔥" },
  { clave: "trofeo", emoji: "🏆" },
  { clave: "risa", emoji: "😂" },
  { clave: "sorpresa", emoji: "😮" },
] as const;

export type Reaccion = (typeof REACCIONES)[number]["clave"];
