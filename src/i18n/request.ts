import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { NAMESPACES } from '../../messages/manifest';

import { locales, defaultLocale } from './idiomas';

export { locales, defaultLocale };

export default getRequestConfig(async ({ requestLocale }) => {
  // Las páginas públicas cacheables (`app/(publico)/p/[locale]`, 21 oct 2026)
  // fijan el idioma con `setRequestLocale`: entonces no se mira la cookie,
  // porque leerla haría que Next renderizase la página en cada visita.
  const fijado = await requestLocale;
  let locale = defaultLocale;

  if (fijado && locales.includes(fijado)) {
    locale = fijado;
  } else {
    const localeCookie = (await cookies()).get('NEXT_LOCALE')?.value;
    if (localeCookie && locales.includes(localeCookie)) locale = localeCookie;
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
