import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import AuthGroup from '@/components/ui/AuthGroup'; 
import CategoryDropdown from '@/components/ui/CategoryDropdown';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Handmade Studio",
  description: "Small handcrafted pieces for your living space and gifts.",
};

export default async function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations('public_pages');

  return (
    <div className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col font-sans bg-[#fcfbf9] text-slate-900`}>
      
      {/* HEADER TỐI GIẢN */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          
          {/* Cột Trái: Logo */}
          <Link href="/" className="flex items-center gap-3 group no-underline">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform">
              🍃
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 m-0">{t('header.title')}</h1>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider m-0 mt-0.5">{t('header.subtitle')}</p>
            </div>
          </Link>
          
          {/* Cột Giữa: Menu điều hướng */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-amber-600 transition-colors no-underline">
              {t('header.nav.home')}
            </Link>
            <Link href="/products" className="text-sm font-semibold text-slate-600 hover:text-amber-600 transition-colors no-underline">
              {t('header.nav.products')}
            </Link>
            <CategoryDropdown />
            <Link href="/posts" className="text-sm font-semibold text-slate-600 hover:text-amber-600 transition-colors no-underline">
              {t('header.nav.posts')}
            </Link>
          </nav>

          {/* Cột Phải: Tool & User */}
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <div className="w-px h-6 bg-slate-200 hidden sm:block"></div> {/* Dấu gạch dọc phân cách nhẹ nhàng */}
            <AuthGroup />
          </div>

        </div>
      </header>

      {/* NỘI DUNG CHÍNH */}
      <main className="flex-grow">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-8 text-center text-sm text-slate-500">
        <p className="m-0">{t('footer')}</p>
      </footer>
    </div>
  );
}