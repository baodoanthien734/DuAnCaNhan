'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getPublicPostBySlug, resolvePostImageUrl } from '@/lib/public-posts-api';

export default function PostDetailPage() {
  const t = useTranslations('public_posts');
  const { slug } = useParams();
  const router = useRouter();
  
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await getPublicPostBySlug(slug as string);
        setPost(data);
      } catch (error) {
        console.error('Lỗi hoặc không tìm thấy bài viết', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex justify-center pt-32">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex flex-col items-center justify-center pt-20 pb-32">
        <p className="text-slate-500 mb-6">{t('not_found')}</p>
        <Link href="/posts" className="px-6 py-2.5 bg-amber-600 text-white font-medium rounded-full hover:bg-amber-700 transition">
          {t('back')}
        </Link>
      </div>
    );
  }

  return (
    <article className="bg-[#fcfbf9] min-h-screen pb-20">
      
      {/* Nút Back */}
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-6">
        <Link href="/posts" className="inline-flex items-center gap-2 text-slate-500 hover:text-amber-600 transition-colors font-medium text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
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
        
        {/* Tác giả & Ngày tháng */}
        <div className="flex items-center justify-center gap-4 text-sm text-slate-500 border-y border-slate-200 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              {post.author.name.charAt(0)}
            </div>
            <span className="font-semibold text-slate-800">{post.author.name}</span>
          </div>
          <span>•</span>
          <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
        </div>
      </header>

      {/* Ảnh Bìa (Thumbnail) */}
      {post.thumbnail && (
        <div className="max-w-5xl mx-auto px-6 mb-16">
          <div className="aspect-[21/9] w-full rounded-[32px] overflow-hidden bg-slate-100 shadow-lg">
            <img 
              src={resolvePostImageUrl(post.thumbnail)} 
              alt={post.title} 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Nội dung chính (HTML Content) */}
      <div className="max-w-3xl mx-auto px-6">
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

    </article>
  );
}