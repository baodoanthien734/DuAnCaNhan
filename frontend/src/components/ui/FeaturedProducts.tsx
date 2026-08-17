'use client'; 

import { useState } from 'react';
import Link from 'next/link';
import { resolveImageUrl } from '@/lib/utils';

interface FeaturedProductsProps {
  categories: any[];
  products: any[];
  dict: {
    all: string;
    empty: string;
    detail: string;
  };
}

export default function FeaturedProducts({ categories, products, dict }: FeaturedProductsProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  const filteredProducts = activeCategoryId === null
    ? products
    : products.filter(p => p.categoryId === activeCategoryId);

  // Lấy ra thông tin danh mục đang được chọn (để lấy tên và slug làm link)
  const activeCategory = activeCategoryId 
    ? categories.find(c => c.id === activeCategoryId) 
    : null;

  return (
    <div>
      {/* Tabs Danh mục (Giữ nguyên như cũ) */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <button
          onClick={() => setActiveCategoryId(null)}
          style={{
            padding: '10px 18px',
            backgroundColor: activeCategoryId === null ? '#f59e0b' : '#ffffff',
            color: activeCategoryId === null ? '#ffffff' : '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '999px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
        >
          {dict.all}
        </button>
        
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategoryId(cat.id)}
            style={{
              padding: '10px 18px',
              backgroundColor: activeCategoryId === cat.id ? '#f59e0b' : '#ffffff',
              color: activeCategoryId === cat.id ? '#ffffff' : '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Lưới sản phẩm (Giữ nguyên như cũ) */}
      {filteredProducts.length === 0 ? (
        <p style={{ color: '#6b7280' }}>{dict.empty}</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '22px'
        }}>
          {filteredProducts.map((item) => {
            const imageUrl = item.images && item.images.length > 0 ? item.images[0] : null;

            return (
              <div key={item.id} style={{ backgroundColor: '#ffffff', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)', transition: 'transform 0.25s' }}>
                <div style={{ height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7', overflow: 'hidden' }}>
                  {imageUrl ? (
                    <img src={resolveImageUrl(imageUrl)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                      {dict.detail}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 👇 NÚT "XEM TẤT CẢ" VỪA ĐƯỢC THÊM VÀO ĐÂY 👇 */}
      {activeCategory && filteredProducts.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Link 
            href={`/categories/${activeCategory.slug}`}
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#fff',
              color: '#d97706',
              border: '2px solid #d97706',
              borderRadius: '999px',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'all 0.2s'
            }}
          >
            Xem tất cả {activeCategory.name} →
          </Link>
        </div>
      )}

    </div>
  );
}