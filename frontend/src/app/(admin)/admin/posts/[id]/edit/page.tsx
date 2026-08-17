'use client';

import React, { FormEvent, useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import TiptapEditor from '@/components/ui/TiptapEditor';
import { getPostById, updatePost } from '@/lib/posts-api';
import { resolveImageUrl } from '@/lib/utils';

type ToastState = {
  type: 'success' | 'error';
  message: string;
} | null;

export default function AdminPostEditPage({ params }: { params: Promise<{ id: string }> }) {
  // Sử dụng React.use() để unwrap param id từ URL
  const { id } = use(params);
  
  // Trỏ đúng namespace "posts.edit" trong i18n
  const t = useTranslations('posts.edit');
  const router = useRouter();

  // State lưu dữ liệu form
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  
  // State quản lý file
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [oldThumbnailUrl, setOldThumbnailUrl] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  
  // State quản lý UI
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  // Fallback URL cho ảnh (thay đổi port nếu backend của bạn khác)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://localhost:3001';

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
  }

  function handleImageAdded(file: File) {
    setImageFiles((currentFiles) => [...currentFiles, file]);
  }

  function handleThumbnailChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setThumbnailFile(nextFile);
  }

  useEffect(() => {
    let isMounted = true; // Tránh lỗi memory leak khi component unmount

    async function fetchPostData() {
      try {
        // Gọi API lấy dữ liệu theo ID
        const post = await getPostById(id);
        
        if (isMounted && post) {
          setTitle(post.title || '');
          setSummary(post.summary || '');
          setIsPublished(Boolean(post.isPublished));
          
          // Xử lý đường dẫn ảnh trong nội dung HTML
          let parsedContent = post.content || '';
          // Nối API_BASE_URL vào trước tất cả các src="/uploads..."

          parsedContent = parsedContent.replace(/src="\/uploads/g, `src="${baseUrl}/uploads`);
          setContent(parsedContent);
          setOldThumbnailUrl(post.thumbnail || null);
        }
      } catch (error) {
        console.error('Lỗi khi tải bài viết:', error);
        if (isMounted) {
          showToast('error', t('toastFetchError'));
          // Nếu không tìm thấy bài viết (lỗi 404), tự động đá về trang danh sách
          setTimeout(() => {
            router.push('/admin/posts');
          }, 1500);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false); // Tắt hiệu ứng loading để hiện Form
        }
      }
    }

    fetchPostData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [id, router, t]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setToast(null);

    try {
      const formData = new FormData();
      
      // 1. Append dữ liệu Text
      formData.append('title', title);
      formData.append('summary', summary);
      formData.append('isPublished', String(isPublished));
      formData.append('content', content);

      // 2. Append Thumbnail (CHỈ GỬI KHI CÓ ẢNH MỚI)
      // Nếu thumbnailFile là null, Backend sẽ tự động hiểu là giữ nguyên URL cũ
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }

      // 3. Append Content Images (Từ Tiptap)
      for (const file of imageFiles) {
        formData.append('contentImages', file);
      }

      // Gọi API Update
      await updatePost(id, formData);

      // Hiện thông báo thành công và chuyển hướng
      showToast('success', t('toastSuccess'));
      window.setTimeout(() => {
        router.push('/admin/posts');
      }, 900);
      
    } catch (error: any) {
      console.error('Failed to update post', error);
      const responseMessage = error.response?.data?.message;

      // Xử lý các mã lỗi phổ biến
      if (error.response?.status === 401 || error.response?.status === 403) {
        showToast('error', t('toastAuthError'));
      } else if (responseMessage) {
        showToast(
          'error',
          t('toastValidationError', {
            message:
              typeof responseMessage === 'string'
                ? responseMessage
                : JSON.stringify(responseMessage, null, 2),
          }),
        );
      } else {
        showToast('error', t('toastGenericError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-500">Đang tải dữ liệu bài viết...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div>
        <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-sky-600">
          {t('eyebrow')}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">{t('title')}</h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600">{t('description')}</p>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="grid gap-6 rounded-[28px] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        {toast ? (
          <div
            className={
              toast.type === 'success'
                ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'
                : 'rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'
            }
          >
            {toast.message}
          </div>
        ) : null}

        <div className="grid gap-5">
          {/* Tiêu đề */}
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>{t('fields.titleLabel')}</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('fields.titlePlaceholder')}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400"
            />
          </label>

          {/* Tóm tắt */}
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>{t('fields.summaryLabel')}</span>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder={t('fields.summaryPlaceholder')}
              rows={4}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400"
            />
          </label>

          {/* Ảnh bìa */}
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>{t('fields.thumbnailLabel')}</span>
            
            {/* Hiển thị ảnh cũ nếu có */}
            {(thumbnailFile || oldThumbnailUrl) && (
              <div className="mb-2">
                <img 
                  src={thumbnailFile ? URL.createObjectURL(thumbnailFile) : resolveImageUrl(oldThumbnailUrl)} 
                  alt="Current thumbnail"
                  className="h-24 w-32 rounded-lg object-cover border border-slate-200"
                />
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            />
            <span className="text-xs font-normal text-slate-500">
              {thumbnailFile ? thumbnailFile.name : t('fields.thumbnailHint')}
            </span>
          </label>

          {/* Trạng thái xuất bản */}
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(event) => setIsPublished(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span>{t('fields.publishLabel')}</span>
          </label>

          {/* Nội dung Tiptap */}
          <div className="grid gap-2">
            <div className="text-sm font-medium text-slate-700">{t('fields.contentLabel')}</div>
            <TiptapEditor
              content={content}
              onContentChange={setContent}
              onImageAdded={handleImageAdded}
            />
            <p className="text-xs text-slate-500">
              {t('fields.contentHint', { count: imageFiles.length })}
            </p>
          </div>
        </div>

        {/* Nút thao tác */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? t('actions.submitting') : t('actions.submit')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/posts')}
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {t('actions.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}