import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { getPublicPostBySlug } from '@/lib/public-posts-api';
import { resolveImageUrl } from '@/lib/utils';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PostDetailPage({ params }: PageProps) {
  const t = await getTranslations('public_posts');
  const locale = await getLocale(); // BỔ SUNG: Lấy locale để format tiền/ngày
  
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  
  let post: any = null;

  try {
    post = await getPublicPostBySlug(slug);
  } catch (error) {
    notFound();
  }

  if (!post) {
    notFound();
  }

  // Hàm format tiền tệ
  const formatCurrency = (value: number) => {
    if (locale === 'en') {
      return `${new Intl.NumberFormat('en-US').format(value)} VND`;
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <article className="bg-[#fcfbf9] min-h-screen pb-20">
      
      {/* Nút Back */}
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-6">
        <Link href="/posts" className="inline-flex items-center gap-2 text-slate-500 hover:text-amber-600 transition-colors font-medium text-sm">
         {t('back')}
        </Link>
      </div>

      {/* Header Bài viết */}
      <header className="max-w-3xl mx-auto px-6 mb-12 text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">
          {post.title}
        </h1>
        <p className="text-lg md:text-xl text-slate-500 leading-relaxed mb-8">
          {post.summary}
        </p>
        
        <div className="flex items-center justify-center gap-4 text-sm text-slate-500 border-y border-slate-200 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              {post.author?.name?.charAt(0) || 'U'}
            </div>
            <span className="font-semibold text-slate-800">{post.author?.name || 'Unknown'}</span>
          </div>
          <span>•</span>
          <time dateTime={post.createdAt}>
            {new Date(post.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </time>
        </div>
      </header>

      {/* Ảnh Bìa (Thumbnail) */}
      {post.thumbnail && (
        <div className="max-w-5xl mx-auto px-6 mb-16">
          <div className="aspect-[21/9] w-full rounded-[32px] overflow-hidden bg-slate-100 shadow-lg">
            <img 
              src={resolveImageUrl(post.thumbnail)} 
              alt={post.title} 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Nội dung chính (HTML Content) */}
      <div className="max-w-3xl mx-auto px-6 mb-16">
        <div 
          className="prose prose-lg prose-slate max-w-none 
                     prose-headings:font-bold prose-headings:text-slate-900
                     prose-a:text-amber-600 hover:prose-a:text-amber-700
                     prose-img:rounded-2xl prose-img:shadow-md prose-img:mx-auto
                     prose-p:leading-relaxed prose-p:text-slate-700
                     prose-blockquote:border-l-4 prose-blockquote:border-amber-400 prose-blockquote:bg-amber-50 prose-blockquote:py-2 prose-blockquote:px-5 prose-blockquote:rounded-r-xl prose-blockquote:not-italic"
          dangerouslySetInnerHTML={{ 
            __html: post.content.replace(/src="(\/uploads\/posts\/[^"]+)"/g, `src="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}$1"`) 
          }} 
        />
      </div>

      {/* BỔ SUNG: Khu vực Sản phẩm được gắn */}
      {post.postProducts && post.postProducts.length > 0 && (
        <div className="max-w-3xl mx-auto px-6 pt-12 border-t-2 border-slate-200 border-dashed">
          <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            {t('featured_products')}
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {post.postProducts.map((item: any) => {
              const product = item.product;
              const mainImg = product.images?.[0] ? resolveImageUrl(product.images[0]) : null;
              
              return (
                <Link 
                  key={product.id} 
                  href={`/products/${product.slug}`}
                  className="group flex items-center p-3 bg-white border border-slate-200 rounded-2xl hover:border-amber-400 hover:shadow-md transition-all duration-300"
                >
                  <div className="w-20 h-20 shrink-0 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
                    {mainImg ? (
                      <img src={mainImg} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <span className="text-2xl">📦</span>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <h4 className="font-semibold text-slate-900 text-sm line-clamp-2 group-hover:text-amber-600 transition-colors">
                      {product.name}
                    </h4>
                    <p className="mt-1 text-sm font-bold text-amber-600">
                      {formatCurrency(Number(product.basePrice))}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

    </article>
  );
}