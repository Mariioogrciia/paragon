import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { NAMESPACES } from '../../messages/manifest';

export const locales = ['es', 'en', 'de', 'fr'];
export const defaultLocale = 'es';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  let locale = defaultLocale;

  if (localeCookie && locales.includes(localeCookie)) {
    locale = localeCookie;
  }

  // Cada namespace de NAMESPACES es una carpeta con un JSON por idioma (ver
  // messages/manifest.ts) — se funden todos en un solo objeto de mensajes,
  // uno por namespace, para que useTranslations("Biblioteca") etc. funcione
  // sin que este archivo tenga que saber qué páginas existen.
  const entries = await Promise.all(
    NAMESPACES.map(async (namespace) => {
      const mod = await import(`../../messages/${namespace}/${locale}.json`);
      return [namespace, mod.default] as const;
    }),
  );

  return {
    locale,
    messages: Object.fromEntries(entries),
  };
});
