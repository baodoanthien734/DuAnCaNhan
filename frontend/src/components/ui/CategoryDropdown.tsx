'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getPublicCategories } from '@/lib/public-api';
import { resolveProductImageUrl } from '@/lib/products-api';

type Category = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  image?: string | null;
};

export default function CategoryDropdown() {
  const t = useTranslations('public_pages.header');
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeRootId, setActiveRootId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tải danh mục
  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await getPublicCategories();
        setCategories(data);
      } catch (error) {
        console.error("Lỗi khi tải danh mục", error);
      }
    }
    fetchCategories();
  }, []);

  // Xử lý Click ra ngoài để đóng Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Lấy danh sách danh mục gốc (Root)
  const rootCategories = categories.filter(cat => !cat.parentId);

  // Tự động focus vào danh mục Root đầu tiên khi mở bảng
  useEffect(() => {
    if (isOpen && !activeRootId && rootCategories.length > 0) {
      setActiveRootId(rootCategories[0].id);
    }
  }, [isOpen, activeRootId, rootCategories]);

  // Lấy danh mục con tầng 1
  const getSubcategories = (parentId: number) => {
    return categories.filter(cat => cat.parentId === parentId);
  };

  const activeSubcategories = activeRootId ? getSubcategories(activeRootId) : [];

  return (
    <div className="relative" ref={dropdownRef} style={{ display: 'inline-block' }}>
      
      {/* Nút Trigger (Kích thước và màu sắc đồng bộ hoàn toàn với các Link khác) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          color: '#374151',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px', // Đã chỉnh về 14px cho bằng với Home, Products
          fontFamily: 'inherit',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: 0 // Bỏ padding thừa
        }}
      >
        {t('categories')}
        <svg 
          width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
            transition: 'transform 0.2s' 
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Bảng Mega Menu (Mở bằng Click, căn giữa để chống tràn viền) */}
      {isOpen && (
        <div 
          className="absolute mt-6 bg-white border border-gray-100 shadow-2xl rounded-xl z-50 flex overflow-hidden"
          style={{ 
            top: '100%',
            left: '50%', // Thuật toán căn giữa so với nút bấm
            transform: 'translateX(-50%)',
            width: '600px', // Khổ rộng 600px chia 2 cột an toàn
            minHeight: '300px' 
          }}
        >
          {/* CỘT TRÁI: Danh sách Danh mục Root */}
          <div className="w-2/5 bg-gray-50 border-r border-gray-100 flex flex-col p-2">
            {rootCategories.map((root) => {
              const rootImageUrl = root.image ? resolveProductImageUrl(root.image) : null;
              const isActive = activeRootId === root.id;

              return (
                <button
                  key={root.id}
                  onClick={() => setActiveRootId(root.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    isActive ? 'bg-white shadow-sm border border-gray-200' : 'hover:bg-gray-200/50 border border-transparent'
                  }`}
                >
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-200 flex items-center justify-center shrink-0">
                    {rootImageUrl ? (
                      <img src={rootImageUrl} alt={root.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs">📦</span>
                    )}
                  </div>
                  <span className={`text-sm flex-1 ${isActive ? 'font-bold text-amber-700' : 'font-medium text-gray-700'}`}>
                    {root.name}
                  </span>
                  {isActive && (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-amber-600">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* CỘT PHẢI: Danh sách Danh mục con tương ứng */}
          <div className="w-3/5 bg-white p-4">
            {activeRootId && (
              <>
                {/* Tiêu đề cột phải & Link vào thẳng Root */}
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-800">
                    {rootCategories.find(r => r.id === activeRootId)?.name}
                  </h3>
                  <Link 
                    href={`/categories/${rootCategories.find(r => r.id === activeRootId)?.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                  >
                    Xem tất cả &rarr;
                  </Link>
                </div>

                {/* Danh sách con */}
                {activeSubcategories.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-gray-400 italic text-sm">
                    {t('no_subcategories')}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {activeSubcategories.map(sub => {
                      const subImageUrl = sub.image ? resolveProductImageUrl(sub.image) : null;
                      return (
                        <Link 
                          key={sub.id} 
                          href={`/categories/${sub.slug}`}
                          onClick={() => setIsOpen(false)} // Bấm xong tự đóng menu
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition no-underline group"
                        >
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                            {subImageUrl ? (
                              <img src={subImageUrl} alt={sub.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            ) : (
                              <span className="text-lg">✨</span>
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-amber-600">
                            {sub.name}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}