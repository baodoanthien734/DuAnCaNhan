import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['vi', 'en'],
  localePrefix: 'never',
  defaultLocale: 'vi',
});

export type Locale = (typeof routing.locales)[number];
