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

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const t = await getTranslations('public_pages');

  return (
    <div className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col`} style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#f7f5f2', color: '#111827' }}>
      
      {/* HEADER CHUẨN MỰC, CÂN ĐỐI */}
      <header style={{ 
        backgroundColor: '#fff', 
        padding: '16px 24px', 
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', 
        position: 'sticky', 
        top: 0, 
        zIndex: 50 
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: '16px',
          flexWrap: 'wrap' 
        }}>
          
          {/* Cột Trái: Logo & Slogan */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}></span>
            <div>
              <Link href="/" style={{ textDecoration: 'none', color: '#111827' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, lineHeight: '1.2' }}>{t('header.title')}</h1>
              </Link>
              <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '13px' }}>{t('header.subtitle')}</p>
            </div>
          </div>
          
          {/* Cột Giữa: Menu điều hướng chính */}
          <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <Link href="/" style={{ color: '#374151', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
              {t('header.nav.home')}
            </Link>
            <Link href="/products" style={{ color: '#374151', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
              {t('header.nav.products')}
            </Link>
            
            {/* Nút danh mục sản phẩm với dropdown */}
            <CategoryDropdown />

            {/* Nút mới dẫn đến trang Tạp chí/Blog */}
            <Link href="/posts" style={{ color: '#374151', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
              {t('header.nav.posts')}
            </Link>
          </nav>

          {/* Cột Phải: Ngôn ngữ & Nhóm đăng nhập / giỏ hàng */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <LanguageSwitcher />
            <AuthGroup />
          </div>

        </div>
      </header>

      {/* NỘI DUNG TRANG CON (Được bọc đồng bộ khung max-width ở các trang con) */}
      <main style={{ flexGrow: 1 }}>
        {children}
      </main>

      {/* FOOTER */}
      <footer style={{ backgroundColor: '#fff', color: '#6b7280', padding: '24px 20px', textAlign: 'center', marginTop: 'auto', borderTop: '1px solid #e5e7eb', fontSize: '14px' }}>
        <p style={{ margin: 0 }}>{t('footer')}</p>
      </footer>
    </div>
  );
}