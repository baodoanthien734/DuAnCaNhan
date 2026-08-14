'use client';

import { usePathname, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useEffect, useState } from 'react';

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  
  // 1. Thêm state để lưu ngôn ngữ và trạng thái mounted
  const [currentLocale, setCurrentLocale] = useState('vi');
  const [isMounted, setIsMounted] = useState(false);

  // 2. Chỉ đọc Cookie sau khi component đã mount trên Client
  useEffect(() => {
    setIsMounted(true);
    const locale = Cookies.get('NEXT_LOCALE');
    if (locale) {
      setCurrentLocale(locale);
    }
  }, []);

  const switchLanguage = (newLocale: string) => {
    Cookies.set('NEXT_LOCALE', newLocale, { expires: 365, path: '/' });
    setCurrentLocale(newLocale);
    router.refresh(); 
  };

  // 3. Trả về một khung UI rỗng hoặc mặc định nếu chưa mount để khớp 100% với Server
  if (!isMounted) {
    return (
      <div className="flex items-center gap-2 mr-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
          <button className="px-2.5 py-1 text-xs font-bold rounded-md text-slate-400">VI</button>
          <button className="px-2.5 py-1 text-xs font-bold rounded-md text-slate-400">EN</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mr-2">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
        <button
          onClick={() => switchLanguage('vi')}
          className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
            currentLocale === 'vi' 
              ? 'bg-white text-sky-500 shadow-sm' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          VI
        </button>
        <button
          onClick={() => switchLanguage('en')}
          className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
            currentLocale === 'en' 
              ? 'bg-white text-sky-500 shadow-sm' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          EN
        </button>
      </div>
    </div>
  );
}