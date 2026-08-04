import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { getPublicProductBySlug } from '@/lib/public-api';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const t = await getTranslations('public_pages');
  
  // Await params theo chuẩn Next.js App Router mới nhất
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  let product: any = null;

  try {
    product = await getPublicProductBySlug(slug);
  } catch (error) {
    // Nếu không tìm thấy sản phẩm ở Backend, ném ra trang 404
    notFound();
  }

  if (!product) {
    notFound();
  }

  const mainImage = product.images && product.images.length > 0 ? product.images[0] : null;

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

      <main style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
        {/* Nút quay lại */}
        <Link href="/products" style={{ color: '#4b5563', textDecoration: 'none', fontSize: '14px', fontWeight: '500', display: 'inline-block', marginBottom: '24px' }}>
          {t('product_detail.back')}
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', backgroundColor: '#fff', padding: '32px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.06)' }}>
          
          {/* Cột hình ảnh sản phẩm */}
          <div>
            <div style={{ width: '100%', height: '350px', backgroundColor: '#fef3c7', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {mainImage ? (
                <img src={mainImage} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '64px' }}>📦</span>
              )}
            </div>

            {/* Danh sách ảnh phụ (nếu có từ 2 ảnh trở lên) */}
            {product.images && product.images.length > 1 && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', overflowX: 'auto' }}>
                {product.images.map((img: string, idx: number) => (
                  <img key={idx} src={img} alt="" style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                ))}
              </div>
            )}
          </div>

          {/* Cột thông tin chi tiết */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              {product.category && (
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {product.category.name}
                </span>
              )}
              <h1 style={{ fontSize: '28px', margin: '8px 0 12px', color: '#111827' }}>{product.name}</h1>
              
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#b45309', marginBottom: '16px' }}>
                {Number(product.basePrice).toLocaleString()} đ
              </div>

              <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '24px' }}>
                {product.description || 'Không có mô tả chi tiết cho sản phẩm này.'}
              </p>

              {/* Hiển thị Biến thể (Variants) nếu có */}
              {product.variants && product.variants.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '10px', color: '#374151' }}>
                    {t('product_detail.variants')}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {product.variants.map((v: any) => (
                      <div key={v.id} style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', backgroundColor: '#f9fafb' }}>
                        <div style={{ fontWeight: '600' }}>{v.name}</div>
                        <div style={{ color: '#b45309' }}>{Number(v.price).toLocaleString()} đ</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hiển thị Tùy chọn cá nhân hóa (Customizations) nếu có */}
              {product.customizations && product.customizations.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '10px', color: '#374151' }}>
                    {t('product_detail.customizations')}
                  </h3>
                  {product.customizations.map((c: any) => (
                    <div key={c.id} style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                        <span>{c.name}</span>
                        {c.isRequired && <span style={{ color: '#ef4444', fontSize: '11px' }}>{t('product_detail.required')}</span>}
                      </div>
                      {c.choices && c.choices.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {c.choices.map((choice: any) => (
                            <span key={choice.id} style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                              {choice.label} {choice.extraPrice > 0 ? `(+${Number(choice.extraPrice).toLocaleString()} đ)` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nút thêm vào giỏ hàng (Giao diện tĩnh tạm thời) */}
            <button 
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#111827',
                color: '#fff',
                border: 'none',
                borderRadius: '999px',
                fontWeight: '600',
                fontSize: '15px',
                cursor: 'pointer',
                marginTop: '12px'
              }}
            >
              🛒 {t('product_detail.addToCart')}
            </button>

          </div>
        </div>
      </main>
    </div>
  );
}