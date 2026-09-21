import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const locales = ['es', 'en', 'de', 'fr'];
export const defaultLocale = 'es';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  let locale = defaultLocale;
  
  if (localeCookie && locales.includes(localeCookie)) {
    locale = localeCookie;
  }
  
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
