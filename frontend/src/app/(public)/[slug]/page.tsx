import React from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getPublicProductsByCategorySlug } from '@/lib/public-api';
import { notFound } from 'next/navigation';
import { resolveImageUrl } from '@/lib/utils';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CategoryPage({ params }: PageProps) {
  const tCategories = await getTranslations('categories');
  const tProducts = await getTranslations('products');
  
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  // Thêm dòng này để xem trình duyệt đang bắt bạn gọi API với cái tên gì:
  console.log("=====> SLUG TRÌNH DUYỆT ĐANG YÊU CẦU LÀ:", slug);

  // Chặn ngay những request file rác từ trình duyệt
  if (slug === 'favicon.ico' || slug.includes('.')) {
     notFound(); 
  }

  let category: any = null;
  let products: any[] = [];
  let breadcrumbs: any[] = [];
  let childrenCategories: any[] = [];

  try {
    const data = await getPublicProductsByCategorySlug(slug);
    category = data.category;
    products = data.products || [];
    breadcrumbs = data.breadcrumbs || []; 
    childrenCategories = data.children || [];
  } catch (error) {
    // Thêm log để biết API bị lỗi gì thay vì âm thầm văng 404
    console.error(`❌ [CategoryPage] LỖI GỌI API VỚI SLUG "${slug}":`, error);
    notFound();
  }

  if (!category) {
    // Thêm log để biết API chạy thành công nhưng không trả về category
    console.error(`❌ [CategoryPage] KHÔNG TÌM THẤY CATEGORY NÀO KHỚP VỚI SLUG "${slug}"`);
    notFound();
  }

  const displayBreadcrumbs = breadcrumbs.length > 0 
    ? breadcrumbs 
    : [{ id: category.id, name: category.name, slug: category.slug }];

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '40px 20px', color: '#111827', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* --- BREADCRUMB --- */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <Link href="/" className="text-gray-500 hover:text-gray-900 transition-colors no-underline">
            {tCategories('home')}
          </Link>
          
          {displayBreadcrumbs.map((crumb, index) => {
            const isLast = index === displayBreadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id}>
                <span style={{ color: '#d1d5db' }}>/</span>
                {isLast ? (
                  <span style={{ color: '#111827', fontWeight: '600' }}>
                    {crumb.name}
                  </span>
                ) : (
                  <Link 
                    href={`/${crumb.slug}`} 
                    className="text-gray-500 hover:text-gray-900 transition-colors no-underline"
                  >
                    {crumb.name}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* --- TIÊU ĐỀ DANH MỤC --- */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', color: '#111827', margin: 0, fontWeight: '800', letterSpacing: '-0.02em' }}>
            {category.name}
          </h1>
        </div>

        {/* --- KHU VỰC: "BẠN CŨNG CÓ THỂ MUỐN?" (Danh mục con) --- */}
        {childrenCategories.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '18px', color: '#374151', marginBottom: '20px', fontWeight: '700' }}>
              {tCategories('you_might_also_like')}
            </h2>
            <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '16px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {childrenCategories.map(child => {
                const childImgUrl = child.image ? resolveImageUrl(child.image) : null;
                
                return (
                  <Link 
                    key={child.id} 
                    href={`/${child.slug}`} 
                    style={{ textDecoration: 'none', minWidth: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                    className="group"
                  >
                    {/* Vòng tròn ảnh danh mục (Dùng Tailwind group-hover để scale) */}
                    <div 
                      className="w-[100px] h-[100px] rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-105"
                    >
                      {childImgUrl ? (
                        <img src={childImgUrl} alt={child.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '24px' }}>✨</span>
                      )}
                    </div>
                    {/* Tên và Số lượng */}
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#111827' }}>{child.name}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                        {tCategories('products_count', { count: child.productCount || 0 })}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* --- LƯỚI SẢN PHẨM CHÍNH --- */}
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280', fontSize: '16px', backgroundColor: '#fff', borderRadius: '24px', border: '1px dashed #e5e7eb' }}>
            <span style={{ display: 'block', fontSize: '40px', marginBottom: '16px' }}>🍃</span>
            {tCategories('empty')}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '24px'
          }}>
            {products.map((item) => {
              const imageUrl = item.images && item.images.length > 0 ? resolveImageUrl(item.images[0]) : null;

              return (
                <div 
                  key={item.id} 
                  className="bg-white rounded-[24px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] group flex flex-col"
                >
                  <Link href={`/products/${item.slug}`} style={{ textDecoration: 'none', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Phần Hình Ảnh */}
                    <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
                      {imageUrl ? (
                        <img src={imageUrl} alt={item.name} className="transition-transform duration-500 group-hover:scale-105" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '40px', opacity: 0.5 }}>📦</span>
                      )}
                    </div>

                    {/* Phần Nội Dung (Tên, Mô tả, Giá) */}
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                      <h4 className="group-hover:text-amber-600 transition-colors" style={{ margin: '0 0 8px', fontSize: '18px', color: '#111827', fontWeight: '700' }}>
                        {item.name}
                      </h4>
                      
                      <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '14px', lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flexGrow: 1 }}>
                        {item.description || tProducts('no_description')}
                      </p>
                      
                      {/* Đã sửa justify-content thành justifyContent */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #f8fafc' }}>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: '#b45309' }}>
                          {Number(item.basePrice).toLocaleString()} {tProducts('currency')}
                        </span>
                        <div className="group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300" style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#111827', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </div>
                    </div>
                    
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}