import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { getPublicCategories, getPublicProducts } from '@/lib/public-api';
import FeaturedProducts from '@/components/ui/FeaturedProducts'; 
// Dẫn link import tới AuthGroup
import AuthGroup from '@/components/ui/AuthGroup'; 

export default async function Home() {
  const t = await getTranslations('public_pages');

  let categories: any[] = [];
  let products: any[] = [];

  try {
    const [catRes, prodRes] = await Promise.all([
      getPublicCategories(),
      getPublicProducts({ take: 20 }), // Lấy khoảng 20 sản phẩm để filter cho phong phú
    ]);
    categories = Array.isArray(catRes) ? catRes : catRes.items || [];
    if (Array.isArray(prodRes)) {
      products = prodRes;
    } else if (prodRes && typeof prodRes === 'object' && 'items' in prodRes) {
      products = (prodRes as any).items || [];
    }
  } catch (error) {
    console.error('Failed to fetch public data for home page:', error);
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#f7f5f2', color: '#111827' }}>
      <header style={{ backgroundColor: '#fff', padding: '22px 20px', boxShadow: '0 10px 35px rgba(15, 23, 42, 0.05)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: '30px', margin: 0 }}>{t('header.title')}</h1>
            <p style={{ margin: '6px 0 0', color: '#6b7280' }}>{t('header.subtitle')}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <LanguageSwitcher />
            {/* Gọi Component chứa Nút bấm và Modal tại đây */}
            <AuthGroup />
          </div>
        </div>
      </header>

      <section style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)', padding: '70px 20px 50px', textAlign: 'center' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{ margin: 0, color: '#d97706', fontWeight: '700', letterSpacing: '0.12em' }}>{t('hero.eyebrow')}</p>
          <h2 style={{ margin: '18px 0 16px', fontSize: '44px', lineHeight: '1.05', color: '#111827' }}>{t('hero.title')}</h2>
          <p style={{ margin: '0 auto 28px', maxWidth: '640px', color: '#4b5563', fontSize: '17px', lineHeight: '1.8' }}>
            {t('hero.description')}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link href="/products" style={{ backgroundColor: '#111827', color: '#fff', border: 'none', padding: '14px 30px', borderRadius: '999px', cursor: 'pointer', fontWeight: '700', textDecoration: 'none' }}>
              {t('hero.primaryCta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Gọi Component Lọc Tại Chỗ (Thay thế cho phần Categories và Products cũ) */}
      <section style={{ padding: '40px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '26px', color: '#111827' }}>
             {t('categories.title')}
          </h3>
          
          <FeaturedProducts 
            categories={categories} 
            products={products} 
            dict={{
              all: t('categories.all'),
              empty: t('products.empty'),
              detail: t('products.detail')
            }}
          />
          
        </div>
      </section>

      <footer style={{ backgroundColor: '#f3f4f6', color: '#6b7280', padding: '26px 20px', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>{t('footer')}</p>
      </footer>
    </div>
  );
}