// This component is a product carousel that displays a list of products in a horizontally scrollable format. It includes left and right navigation buttons for smooth scrolling, and each product is displayed with an image, name, description, and price. The component uses React hooks for state management and references, and it leverages Tailwind CSS for styling.
'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { resolveProductImageUrl } from '@/lib/products-api';

interface ProductCarouselProps {
  products: any[];
}

export default function ProductCarousel({ products }: ProductCarouselProps) {
  const tProducts = useTranslations('products');
  const carouselRef = useRef<HTMLDivElement>(null);

  // Hàm xử lý cuộn mượt mà
  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 300; // Khoảng cách trượt mỗi lần bấm
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="relative group/carousel">
      
      {/* ⬅️ Nút lướt trái (Chỉ hiện trên màn hình lớn khi hover) */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/3 -translate-y-1/2 -ml-4 z-10 w-11 h-11 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center text-slate-600 hover:text-amber-600 hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex"
      >
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* 📦 Container chứa sản phẩm trượt ngang */}
      <div
        ref={carouselRef}
        // Tailwind classes để làm Slider: overflow-x-auto, snap-x (hút vào lề), và ẩn thanh scroll
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-8 pt-4 scroll-smooth [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} 
      >
        {products.map((item) => {
          const imageUrl = item.images && item.images.length > 0 ? resolveProductImageUrl(item.images[0]) : null;

          return (
            <div
              key={item.id}
              // Chiều rộng cố định cho mỗi thẻ để không bị bóp méo
              className="w-[260px] md:w-[280px] flex-shrink-0 snap-start bg-white rounded-[24px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_15px_30px_rgba(0,0,0,0.08)] group/card flex flex-col"
            >
              <Link href={`/products/${item.slug}`} className="block no-underline flex-grow flex flex-col">
                <div className="aspect-[4/3] sm:aspect-square w-full bg-[#f8fafc] overflow-hidden relative">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl opacity-50">📦</div>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <h4 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1 group-hover/card:text-amber-600 transition-colors">
                    {item.name}
                  </h4>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-grow">
                    {item.description || tProducts('no_description')}
                  </p>
                  <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-50">
                    <span className="text-lg font-extrabold text-amber-700">
                      {Number(item.basePrice).toLocaleString()} {tProducts('currency')}
                    </span>
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center group-hover/card:bg-slate-900 group-hover/card:text-white transition-colors duration-300">
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* ➡️ Nút lướt phải (Chỉ hiện trên màn hình lớn khi hover) */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/3 -translate-y-1/2 -mr-4 z-10 w-11 h-11 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center text-slate-600 hover:text-amber-600 hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex"
      >
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      
    </div>
  );
}