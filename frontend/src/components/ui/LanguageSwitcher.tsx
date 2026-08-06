'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Cookies from 'js-cookie';

const locales = [
  { code: 'vi', flag: '🇻🇳' },
  { code: 'en', flag: '🇬🇧' },
] as const;

export default function LanguageSwitcher() {
  const router = useRouter();
  const t = useTranslations('language_switcher');
  const [locale, setLocale] = useState('vi');

  useEffect(() => {
    const cookieLocale = Cookies.get('NEXT_LOCALE') || 'vi';
    setLocale(cookieLocale);
  }, []);

  const handleChange = (nextLocale: string) => {
    if (nextLocale === locale) return;

    Cookies.set('NEXT_LOCALE', nextLocale, {
      expires: 365,
      sameSite: 'lax',
      path: '/',
    });
    setLocale(nextLocale);
    router.refresh();
  };

  return (
    <div className="relative inline-flex items-center">
      <label className="sr-only" htmlFor="language-switcher">
        {t('label')}
      </label>
      <select
        id="language-switcher"
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        className="appearance-none rounded-full border border-slate-200 bg-white px-3 py-2 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-slate-300"
        aria-label={t('select_aria_label')}
      >
        {locales.map((item) => (
          <option key={item.code} value={item.code}>
            {item.flag} {t(`locales.${item.code}`)}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 text-xs">▾</span>
    </div>
  );
}
