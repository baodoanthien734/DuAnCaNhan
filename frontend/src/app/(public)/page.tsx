import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getPublicCategories, getPublicProducts } from '@/lib/public-api';
import FeaturedProducts from '@/components/ui/FeaturedProducts'; 

// 🗑️ Đã xóa import LanguageSwitcher và AuthGroup vì chúng đã nằm ở layout.tsx

export default async function Home() {
  const t = await getTranslations('public_pages');

  let categories: any[] = [];
  let products: any[] = [];

  try {
    const [catRes, prodRes] = await Promise.all([
      getPublicCategories(),
      getPublicProducts({ take: 20 }), 
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
    // 🗑️ Đã xóa minHeight 100vh ở đây để nhường quyền kiểm soát chiều cao cho layout.tsx
    <div style={{ color: '#111827' }}>
      
      {/* 🗑️ ĐÃ XÓA TOÀN BỘ KHỐI <header> BỊ TRÙNG LẶP */}

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

      <section style={{ padding: '40px 20px', backgroundColor: '#f7f5f2' }}>
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

      {/* 🗑️ ĐÃ XÓA <footer> VÌ layout.tsx ĐÃ CÓ FOOTER CHUNG */}
    </div>
  );
}