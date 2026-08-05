'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import TiptapEditor from '@/components/ui/TiptapEditor';
import { apiClient } from '@/lib/api-client';

type ToastState = {
  type: 'success' | 'error';
  message: string;
} | null;

export default function AdminPostCreatePage() {
  const t = useTranslations('posts.create');
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setToast(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('summary', summary);
      formData.append('isPublished', String(isPublished));
      formData.append('content', content);

      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }

      for (const file of imageFiles) {
        formData.append('contentImages', file);
      }

      await apiClient.post('/admin/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showToast('success', t('toastSuccess'));
      window.setTimeout(() => {
        router.push('/admin/posts');
      }, 900);
    } catch (error: any) {
      console.error('Failed to create post', error);
      const responseMessage = error.response?.data?.message;

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

  return (
    <div className="grid gap-6">
      <div>
        <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-sky-600">
          {t('eyebrow')}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">{t('title')}</h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600">{t('description')}</p>
      </div>

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

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>{t('fields.thumbnailLabel')}</span>

            {thumbnailFile && (
              <div className="mb-2">
                <img 
                  src={URL.createObjectURL(thumbnailFile)} 
                  alt="Thumbnail preview" 
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

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(event) => setIsPublished(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span>{t('fields.publishLabel')}</span>
          </label>

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
