import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getPublicProducts, getPublicCategories } from '@/lib/public-api';
import { resolveImageUrl } from '@/lib/utils';
import LiveSearch from '@/components/ui/LiveSearch'; 

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
        categoryId: categoryId ? Number(categoryId) : undefined,
        take: 100 
      }),
      getPublicCategories(),
    ]);

    products = Array.isArray(prodRes) ? prodRes : prodRes.items || [];
    categories = Array.isArray(catRes) ? catRes : catRes.items || [];
  } catch (error) {
    console.error('Failed to fetch products page data:', error);
  }

  const rootCategories = categories.filter(c => !c.parentId && !c.isSystem);

  return (
    <div className="bg-[#fcfbf9] min-h-screen pb-24 font-sans text-slate-900">
      
      {/* HEADER CỦA TRANG VÀ THANH TÌM KIẾM */}
      <div className="bg-white border-b border-slate-100 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {tProducts('list_title')}
            </h2>
            <p className="text-slate-500 mt-1.5 text-sm">
              {searchQuery 
                ? tProducts('search_result_for', { query: searchQuery }) 
                : tProducts('explore_all')}
            </p>
          </div>

          <div className="w-full md:w-[400px] z-40">
            <LiveSearch />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* LỌC NHANH DANH MỤC GỐC */}
        <div className="flex gap-2.5 overflow-x-auto pb-5 no-scrollbar mb-6">
          <Link
            href="/products"
            className={`px-5 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shadow-sm ${
              !categoryId ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tCategories('all')}
          </Link>
          {rootCategories.map((cat) => {
            const isActive = Number(categoryId) === cat.id;
            return (
              <Link
                key={cat.id}
                href={`/products?categoryId=${cat.id}`}
                className={`px-5 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shadow-sm ${
                  isActive ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>

        {/* LƯỚI SẢN PHẨM NGHỆ THUẬT */}
        {products.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
            <svg 
              className="w-14 h-14 text-slate-900 opacity-20 mx-auto mb-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-base text-slate-500 font-medium">{tProducts('empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((item) => {
              const imageUrl = item.images && item.images.length > 0 ? resolveImageUrl(item.images[0]) : null;

              return (
                <div 
                  key={item.id} 
                  className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_15px_30px_rgba(0,0,0,0.08)] group flex flex-col"
                >
                  <Link href={`/products/${item.slug}`} className="block no-underline flex-grow flex flex-col">
                    
                    <div className="aspect-square w-full bg-slate-50 overflow-hidden relative">
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={item.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl opacity-50">📦</div>
                      )}
                    </div>
                    
                    {/* PHẦN NỘI DUNG */}
                    <div className="p-5 flex flex-col flex-grow">
                      <h4 className="text-base font-bold text-slate-900 mb-1.5 line-clamp-1 group-hover:text-amber-600 transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3 flex-grow leading-relaxed">
                        {item.description || tProducts('no_description')}
                      </p>
                      
                      <div className="flex justify-between items-center mt-auto pt-3 border-t border-slate-50">
                        <span className="text-base font-extrabold text-amber-700">
                          {Number(item.basePrice).toLocaleString()} {tProducts('currency')}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        )}
      </main>
    </div>
  );
}