import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getPublicProductBySlug } from '@/lib/public-api';
import { notFound } from 'next/navigation';
import AddToCartForm from '@/components/ui/AddToCartForm';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const tProducts = await getTranslations('products');
  
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  let product: any = null;

  try {
    product = await getPublicProductBySlug(slug);
  } catch (error) {
    notFound();
  }

  if (!product) {
    notFound();
  }

  const mainImage = product.images && product.images.length > 0 ? product.images[0] : null;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '40px 20px', color: '#111827' }}>
      <main style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <Link href="/products" style={{ color: '#4b5563', textDecoration: 'none', fontSize: '14px', fontWeight: '500', display: 'inline-block', marginBottom: '24px' }}>
          {tProducts('back_to_products')}
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

            {product.images && product.images.length > 1 && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', overflowX: 'auto' }}>
                {product.images.map((img: string, idx: number) => (
                  <img key={idx} src={img} alt="" style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                ))}
              </div>
            )}
          </div>

          {/* Cột thông tin chi tiết & Tương tác giỏ hàng */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              {product.category && (
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {product.category.name}
                </span>
              )}
              <h1 style={{ fontSize: '28px', margin: '8px 0 12px', color: '#111827' }}>{product.name}</h1>
              
              <AddToCartForm product={product} />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}