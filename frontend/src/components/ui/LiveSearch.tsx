'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getPublicProducts } from '@/lib/public-api';
import { resolveProductImageUrl } from '@/lib/products-api';
import { useDebounce } from '@/hooks/useDebounce'; 

export default function LiveSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tProducts = useTranslations('products');
  
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);

  // 💡 SỬ DỤNG HOOK: Từ khóa sẽ chỉ cập nhật sau khi người dùng dừng gõ 400ms
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Gọi API dựa trên từ khóa đã được delay (debouncedQuery)
  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await getPublicProducts({ q: debouncedQuery, take: 5 }); 
        setResults(Array.isArray(res) ? res : res.items || []);
        setShowDropdown(true);
      } catch (error) {
        console.error("Lỗi tìm kiếm", error);
      } finally {
        setIsSearching(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
    if (query.trim()) {
      router.push(`/products?q=${encodeURIComponent(query)}`);
    } else {
      router.push(`/products`);
    }
  };

  return (
    <div className="relative flex-1 min-w-[300px]" ref={searchRef}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if(results.length > 0) setShowDropdown(true) }}
          placeholder={tProducts('search_placeholder')}
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-none bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] outline-none text-slate-700 font-medium transition-all focus:ring-2 focus:ring-amber-500/20"
        />
        <svg 
            className="absolute left-4 w-5 h-5 text-slate-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
        >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        
        {isSearching && (
          <div className="absolute right-4 w-5 h-5 border-2 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
        )}
      </form>

      {/* DROPDOWN KẾT QUẢ TÌM KIẾM */}
      {showDropdown && debouncedQuery.trim() !== '' && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden py-2">
          {results.length === 0 && !isSearching ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              {/* Truyền biến {query} vào từ điển */}
              {tProducts('search_no_results', { query: debouncedQuery })}
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
              {results.map((item) => {
                const imgUrl = item.images?.[0] ? resolveProductImageUrl(item.images[0]) : null;
                return (
                  <Link 
                    key={item.id} 
                    href={`/products/${item.slug}`}
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-4 p-3 mx-2 rounded-xl hover:bg-slate-50 transition-colors no-underline group"
                  >
                    <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                      {imgUrl ? (
                        <img src={imgUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      ) : (
                        <span className="flex items-center justify-center h-full text-xl opacity-50">📦</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-slate-800 truncate group-hover:text-amber-600 transition-colors">{item.name}</h5>
                      <p className="text-xs text-slate-500 truncate">{item.category?.name || 'Sản phẩm'}</p>
                    </div>
                    <div className="font-bold text-amber-700 text-sm whitespace-nowrap">
                      {Number(item.basePrice).toLocaleString()} đ
                    </div>
                  </Link>
                );
              })}
              
              <button 
                onClick={handleSubmit}
                className="w-full p-4 mt-2 border-t border-slate-50 text-center text-sm font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
              >
                {/* Truyền biến {query} vào từ điển */}
                {tProducts('search_view_all', { query: debouncedQuery })} &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}