import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { getPublicProductsByCategorySlug } from '@/lib/public-api';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CategoryPage({ params }: PageProps) {
  const t = await getTranslations('public_pages');
  
  // Await params theo chuẩn Next.js App Router mới nhất
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  let category: any = null;
  let products: any[] = [];

  try {
    const data = await getPublicProductsByCategorySlug(slug);
    category = data.category;
    products = data.products;
  } catch (error) {
    // Nếu slug sai hoặc danh mục bị ẩn, trả về trang 404
    notFound();
  }

  if (!category) {
    notFound();
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#f7f5f2', color: '#111827' }}>
      {/* Header nhỏ gọn */}
      <header style={{ backgroundColor: '#fff', padding: '18px 20px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <Link href="/" style={{ fontSize: '22px', fontWeight: 'bold', color: '#111827', textDecoration: 'none' }}>
            🍃 {t('header.title')}
          </Link>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <LanguageSwitcher />
            <Link href="/login" style={{ color: '#111827', textDecoration: 'none', padding: '8px 14px', fontSize: '14px' }}>
              {t('header.login')}
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
        
        {/* Nút quay lại & Tiêu đề danh mục */}
        <div style={{ marginBottom: '32px' }}>
          <Link href="/" style={{ color: '#4b5563', textDecoration: 'none', fontSize: '14px', fontWeight: '500', display: 'inline-block', marginBottom: '16px' }}>
            {t('category_page.back')}
          </Link>
          <h1 style={{ fontSize: '36px', color: '#111827', margin: 0 }}>
            {category.name}
          </h1>
        </div>

        {/* Lưới sản phẩm */}
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280', fontSize: '16px', backgroundColor: '#fff', borderRadius: '16px' }}>
            {t('category_page.empty')}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '22px'
          }}>
            {products.map((item) => {
              const imageUrl = item.images && item.images.length > 0 ? item.images[0] : null;

              return (
                <div key={item.id} style={{ backgroundColor: '#ffffff', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)', transition: 'transform 0.25s' }}>
                  <div style={{ height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7', overflow: 'hidden' }}>
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '40px' }}>📦</span>
                    )}
                  </div>
                  <div style={{ padding: '24px' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '20px', color: '#111827' }}>{item.name}</h4>
                    <p style={{ margin: '0 0 16px', color: '#4b5563', lineHeight: '1.75', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description || '...'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#b45309' }}>
                        {Number(item.basePrice).toLocaleString()} đ
                      </span>
                      <Link 
                        href={`/products/${item.slug}`} 
                        style={{ padding: '10px 18px', backgroundColor: '#111827', color: '#fff', border: 'none', borderRadius: '999px', cursor: 'pointer', fontSize: '14px', textDecoration: 'none' }}
                      >
                        {t('products.detail')}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}