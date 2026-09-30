import { de, enUS, es, fr, type Locale } from "date-fns/locale";

const LOCALES: Record<string, Locale> = { es, en: enUS, de, fr };

/** Idioma de date-fns para el de la app ("hace 7 días" / "7 days ago"); español si no se conoce. */
export function localeFechas(locale: string): Locale {
  return LOCALES[locale] ?? es;
}
