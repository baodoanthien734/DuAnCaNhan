import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getPublicProducts, getPublicCategories } from '@/lib/public-api';
import { resolveProductImageUrl } from '@/lib/products-api';

interface SearchParams {
  q?: string;
  categoryId?: string;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const tProducts = await getTranslations('products');
  const tCategories = await getTranslations('categories');
  
  const resolvedParams = await searchParams;
  const searchQuery = resolvedParams?.q || '';
  const categoryId = resolvedParams?.categoryId || '';

  let products: any[] = [];
  let categories: any[] = [];

  try {
    const [prodRes, catRes] = await Promise.all([
      getPublicProducts({ 
        q: searchQuery, 
        categoryId: categoryId ? Number(categoryId) : undefined 
      }),
      getPublicCategories(),
    ]);

    products = Array.isArray(prodRes) ? prodRes : prodRes.items || [];
    categories = Array.isArray(catRes) ? catRes : catRes.items || [];
  } catch (error) {
    console.error('Failed to fetch products page data:', error);
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '40px 20px', color: '#111827' }}>
      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '24px', color: '#111827' }}>
          {tProducts('list_title')}
        </h2>

        {/* Thanh tìm kiếm và Lọc danh mục */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <form method="GET" action="/products" style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px' }}>
            <input 
              type="text" 
              name="q" 
              defaultValue={searchQuery}
              placeholder={tProducts('search_placeholder')}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '999px',
                border: '1px solid #d1d5db',
                outline: 'none',
                fontSize: '14px',
                backgroundColor: '#fff'
              }}
              aria-label={tProducts('search_input_aria')}
            />
            <button 
              type="submit"
              style={{
                padding: '12px 24px',
                backgroundColor: '#111827',
                color: '#fff',
                border: 'none',
                borderRadius: '999px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
              aria-label={tProducts('search_button_aria')}
            >
              🔍
            </button>
          </form>

          {/* Lọc nhanh theo danh mục */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            <Link
              href="/products"
              style={{
                padding: '10px 16px',
                borderRadius: '999px',
                backgroundColor: !categoryId ? '#111827' : '#fff',
                color: !categoryId ? '#fff' : '#374151',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                fontWeight: '500'
              }}
            >
              {tCategories('all')}
            </Link>
            {categories.map((cat) => {
              const isActive = Number(categoryId) === cat.id;
              return (
                <Link
                  key={cat.id}
                  href={`/products?categoryId=${cat.id}`}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '999px',
                    backgroundColor: isActive ? '#111827' : '#fff',
                    color: isActive ? '#fff' : '#374151',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    fontWeight: '500'
                  }}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Lưới sản phẩm */}
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280', fontSize: '16px' }}>
            {tProducts('empty')}
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
                <div key={item.id} style={{ backgroundColor: '#ffffff', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
                  <div style={{ height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7', overflow: 'hidden' }}>
                    {imageUrl ? (
                      <img src={resolveProductImageUrl(imageUrl)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '40px' }}>📦</span>
                    )}
                  </div>
                  <div style={{ padding: '24px' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '20px', color: '#111827' }}>{item.name}</h4>
                    <p style={{ margin: '0 0 16px', color: '#4b5563', lineHeight: '1.75', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description || tProducts('no_description')}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#b45309' }}>
                        {Number(item.basePrice).toLocaleString()} {tProducts('currency')}
                      </span>
                      <Link 
                        href={`/products/${item.slug}`} 
                        style={{ padding: '10px 18px', backgroundColor: '#111827', color: '#fff', border: 'none', borderRadius: '999px', cursor: 'pointer', fontSize: '14px', textDecoration: 'none' }}
                      >
                        {tProducts('view_detail')}
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