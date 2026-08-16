'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getPublicPosts, PublicPost, resolvePostImageUrl } from '@/lib/public-posts-api';

export default function PostsPage() {
  const t = useTranslations('public_posts');
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getPublicPosts({ take: 12 });
        setPosts(data.items);
      } catch (error) {
        console.error('Failed to fetch posts', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <div className="bg-[#fcfbf9] min-h-screen py-16 px-6 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Tạp chí */}
        <div className="text-center mb-16 space-y-4">
          <p className="text-amber-600 font-bold tracking-[0.2em] uppercase text-sm">{t('eyebrow')}</p>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900">{t('title')}</h1>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">
            {t('description')}
          </p>
        </div>

        {loading ? (
          <div className="text-center text-slate-400 py-20">{t('loading')}</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-slate-400 py-20 bg-white rounded-3xl border border-slate-100">
            {t('empty')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {posts.map((post) => (
              <Link href={`/posts/${post.slug}`} key={post.id} className="group flex flex-col bg-white rounded-[24px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-300 border border-slate-100">
                
                {/* Thumbnail */}
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 relative">
                  {post.thumbnail ? (
                    <img 
                      src={resolvePostImageUrl(post.thumbnail)} 
                      alt={post.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">✍️</div>
                  )}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                    {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>

                {/* Nội dung */}
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-amber-600 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-3 flex-grow">
                    {post.summary}
                  </p>
                  <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      {post.author.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{post.author.name}</span>
                  </div>
                </div>

              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}