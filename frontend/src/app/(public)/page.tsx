import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getPublicCategories, getPublicProducts } from '@/lib/public-api';
// Import Component Carousel mới tạo
import ProductCarousel from '@/components/ui/ProductCarousel';

export default async function Home() {
  const t = await getTranslations('public_pages');

  let categories: any[] = [];
  let products: any[] = [];

  try {
    const [catRes, prodRes] = await Promise.all([
      getPublicCategories(),
      getPublicProducts({ take: 50 }),
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

  const rootCategories = categories.filter(c => !c.parentId && !c.isSystem);

  const getSubCategoryIds = (parentId: number, allCats: any[]): number[] => {
    const children = allCats.filter(c => c.parentId === parentId);
    const subIds = children.map(c => c.id);
    children.forEach(child => {
      subIds.push(...getSubCategoryIds(child.id, allCats));
    });
    return subIds;
  };

  return (
    <div style={{ color: '#111827', backgroundColor: '#fcfbf9', minHeight: '100vh', paddingBottom: '80px' }}>
      
      {/* 🛑 KHU VỰC HERO SECTION (GIỮ NGUYÊN) */}
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

      {/* 🚀 KHU VỰC CÁC TẦNG DANH MỤC */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        
        {rootCategories.map((rootCat) => {
          const validCategoryIds = [rootCat.id, ...getSubCategoryIds(rootCat.id, categories)];
          // Lấy lên đến 12 sản phẩm để Carousel trượt cho sướng mắt
          const sectionProducts = products.filter(p => validCategoryIds.includes(p.categoryId)).slice(0, 12);

          if (sectionProducts.length === 0) return null;

          return (
            <section key={rootCat.id} style={{ marginTop: '70px' }}>
              
              {/* Tiêu đề */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', borderBottom: '2px solid #f3f4f6', paddingBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '30px', color: '#111827', fontWeight: '800', letterSpacing: '-0.02em' }}>
                  {rootCat.name}
                </h3>
                <Link href={`/${rootCat.slug}`} style={{ color: '#d97706', fontWeight: '600', textDecoration: 'none', fontSize: '15px' }} className="hover:underline">
                  {t('categories.viewAll')}
                </Link>
              </div>

              {/* Truyền mảng sản phẩm vào Carousel */}
              <ProductCarousel products={sectionProducts} />

            </section>
          );
        })}
        
      </div>
    </div>
  );
}