import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const locales = ['vi', 'en'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = locales.includes(localeCookie as Locale) ? (localeCookie as Locale) : 'vi';

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
