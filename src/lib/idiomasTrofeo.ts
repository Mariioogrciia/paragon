/**
 * Idiomas de la interfaz y cómo se pide cada uno a cada plataforma (ver
 * lib/trofeosIdioma.ts). Módulo puro: lo usan también las guías en vídeo.
 */
export const IDIOMAS = ["es", "en", "de", "fr"] as const;
export type Idioma = (typeof IDIOMAS)[number];

export function esIdioma(valor: unknown): valor is Idioma {
  return typeof valor === "string" && (IDIOMAS as readonly string[]).includes(valor);
}

/**
 * Idioma de una petición de la app Android (`Accept-Language` con el idioma
 * del teléfono, ver ApiClient.kt). Primer idioma que tengamos; si no, `es`.
 */
export function idiomaDeCabecera(cabecera: string | null): Idioma {
  for (const parte of (cabecera ?? "").split(",")) {
    const codigo = parte.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (esIdioma(codigo)) return codigo;
  }
  return "es";
}

/**
 * Idioma en el que ya está guardado `game_trophy.name/detail` de cada
 * plataforma (comprobado en la base el 1 oct 2026): el servidor sincroniza
 * PSN y Xbox en inglés, Steam y Epic en español.
 */
export const IDIOMA_BASE: Record<string, Idioma> = { psn: "en", xbox: "en", steam: "es", epic: "es" };

/** Código que entiende cada plataforma. Epic y manual no se piden por servidor. */
export const CODIGO_PLATAFORMA: Record<string, Record<Idioma, string> | undefined> = {
  psn: { es: "es-ES", en: "en-US", de: "de-DE", fr: "fr-FR" },
  xbox: { es: "es-ES", en: "en-US", de: "de-DE", fr: "fr-FR" },
  steam: { es: "spanish", en: "english", de: "german", fr: "french" },
};

/** Para las búsquedas de YouTube (parámetros `hl` y `gl`) y la palabra "guía" de cada idioma. */
export const BUSQUEDA_VIDEO: Record<Idioma, { hl: string; gl: string; guia: string }> = {
  es: { hl: "es", gl: "ES", guia: "guía" },
  en: { hl: "en", gl: "US", guia: "guide" },
  de: { hl: "de", gl: "DE", guia: "Anleitung" },
  fr: { hl: "fr", gl: "FR", guia: "guide" },
};
