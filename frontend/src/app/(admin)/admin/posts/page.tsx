"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { listPosts } from "@/lib/posts-api"; 
import { resolveImageUrl } from "@/lib/utils";

export default function AdminPostsPage() {
  const t = useTranslations("posts.list");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [posts, setPosts] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const currentQ = searchParams.get("q") || "";
  const currentStatus = searchParams.get("isPublished") || ""; 
  const currentPage = Number(searchParams.get("page")) || 1;
  const take = 12; 

  const [searchTerm, setSearchTerm] = useState(currentQ);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm !== currentQ) updateFilter("q", searchTerm);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentQ]);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const skip = (currentPage - 1) * take;
        const res = await listPosts({
          q: currentQ,
          isPublished: currentStatus !== "" ? currentStatus : undefined,
          skip,
          take,
        });
        setPosts(res.items || []);
        setTotalItems(res.total || 0);
      } catch (error) {
        console.error("Lỗi tải bài viết:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, [currentQ, currentStatus, currentPage]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    
    if (key !== "page") params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalItems / take);

  // Fallback URL cho ảnh, thay 8080 bằng Port backend của bạn
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            {t("header.title")}
          </h1>
          <p className="mt-2 text-slate-600 text-base max-w-[680px]">
            {t("header.description")}
          </p>
        </div>
        <Link 
          href="/admin/posts/create"
          className="inline-flex items-center justify-center rounded-full px-5 py-2.5 bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition"
        >
          + {t("header.createBtn")}
        </Link>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        {/* Tabs Trạng thái */}
        <div className="flex space-x-6 overflow-x-auto">
          <button
            onClick={() => updateFilter("isPublished", "")}
            className={`whitespace-nowrap pb-2 font-medium text-sm transition-colors ${
              currentStatus === "" 
                ? "border-b-2 border-gray-900 text-gray-900" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t("filter.allStatuses")}
          </button>
          <button
            onClick={() => updateFilter("isPublished", "true")}
            className={`whitespace-nowrap pb-2 font-medium text-sm transition-colors ${
              currentStatus === "true" 
                ? "border-b-2 border-gray-900 text-gray-900" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t("filter.published")}
          </button>
          <button
            onClick={() => updateFilter("isPublished", "false")}
            className={`whitespace-nowrap pb-2 font-medium text-sm transition-colors ${
              currentStatus === "false" 
                ? "border-b-2 border-gray-900 text-gray-900" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t("filter.draft")}
          </button>
        </div>

        {/* Ô Tìm kiếm */}
        <div className="w-full sm:w-72">
          <div className="relative">
            <input
              type="text"
              placeholder={t("filter.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
            {/* Kính lúp Icon */}
            <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      {/* Grid Layout (Giao diện Card) */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-500">{t("table.loading")}</div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          {t("table.empty")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {posts.map((post) => (
            <div key={post.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
              {/* Thumbnail Container tỉ lệ 16:9 */}
              <div className="aspect-video relative bg-gray-100 overflow-hidden">
                {post.thumbnail ? (
                  <img 
                    src={resolveImageUrl(post.thumbnail)} 
                    alt={post.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    {t("table.noImage")}
                  </div>
                )}
                {/* Badge Trạng thái nổi trên ảnh */}
                <div className="absolute top-3 right-3">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full shadow-sm backdrop-blur-md ${
                    post.isPublished 
                      ? 'bg-white/90 text-green-700' 
                      : 'bg-white/90 text-gray-600'
                  }`}>
                    {post.isPublished ? t("filter.published") : t("filter.draft")}
                  </span>
                </div>
              </div>

              {/* Nội dung Card */}
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                  {post.title}
                </h3>
                
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-900">{post.author?.name || 'Admin'}</span>
                    <span className="text-[11px] text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  
                  <Link 
                    href={`/admin/posts/${post.id}/edit`} 
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title={t("table.edit")}
                  >
                    {/* Bút chì Icon */}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Phân trang */}
      {!isLoading && totalPages > 1 && (
        <div className="pt-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {t("pagination.showCount", { current: posts.length, total: totalItems })}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => updateFilter("page", String(currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {t("pagination.prev")}
            </button>
            <button
              onClick={() => updateFilter("page", String(currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {t("pagination.next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}