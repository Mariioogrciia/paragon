/**
 * Claves de las secciones reordenables del perfil público (`/u/[handle]`),
 * en el orden por defecto. `users.profileSectionOrder` guarda una
 * permutación de estas mismas claves; cualquier clave que falte en lo
 * guardado (por ejemplo, una sección añadida después de que alguien ya
 * guardara su orden) se añade al final con este mismo orden por defecto —
 * ver el uso en `u/[handle]/page.tsx`.
 */
/*
 * "collections" y "biblioteca" YA NO ESTÁN aquí: se mudaron a su propia
 * ruta (`/u/[handle]/biblioteca`) y por tanto ya no son secciones
 * reordenables del Resumen. Ofrecerlas en /ajustes prometía algo que no
 * pasaría. Los órdenes ya guardados que las contengan no rompen nada:
 * `normalizeSectionOrder` descarta cualquier clave que no esté en esta
 * lista.
 */
export const DEFAULT_SECTION_ORDER = [
  "wrap",
  "stats",
  "recientes",
  "level",
  "achievements",
  "showcase",
  "favoritos",
] as const;

export type ProfileSectionKey = (typeof DEFAULT_SECTION_ORDER)[number];

export const SECTION_LABELS: Record<ProfileSectionKey, string> = {
  wrap: "Resumen del año (Wrap)",
  stats: "Estadísticas rápidas",
  recientes: "Últimos trofeos",
  level: "Nivel Paragon",
  achievements: "Logros",
  showcase: "Vitrina de trofeos",
  favoritos: "Juegos favoritos",
};

/** Normaliza un orden guardado: solo claves válidas, sin duplicados, con
 * cualquier clave que falte añadida al final en el orden por defecto. */
export function normalizeSectionOrder(order: string[] | null | undefined): ProfileSectionKey[] {
  const validas = new Set<string>(DEFAULT_SECTION_ORDER);
  const limpio = (order ?? []).filter(
    (k, i, arr): k is ProfileSectionKey => validas.has(k) && arr.indexOf(k) === i,
  );
  const faltantes = DEFAULT_SECTION_ORDER.filter((k) => !limpio.includes(k));
  return [...limpio, ...faltantes];
}
