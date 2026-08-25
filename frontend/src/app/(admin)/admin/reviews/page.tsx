'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { getAdminReviews, replyAdminReview, deleteAdminReview } from '@/lib/admin-reviews-api';
import { useModal } from '@/hooks/useModal';
import { resolveImageUrl } from '@/lib/utils';

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  images: string[];
  adminReply: string | null;
  createdAt: string;
  customer: { id: number; name: string; email: string };
  product: { id: number; name: string; slug: string };
  order: { id: number; code: string };
};

const TAKE = 12;

export default function AdminReviewsPage() {
  const t = useTranslations('admin_reviews');
  const modal = useModal();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [replyFilter, setReplyFilter] = useState('');
  const [page, setPage] = useState(1);

  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / TAKE));

  // 1. Logic Debounce Tìm kiếm
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query !== searchInput) {
        setQuery(searchInput);
        setPage(1); // Reset về trang 1 khi search
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchInput, query]);

  // 2. Load Dữ liệu
  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query, ratingFilter, replyFilter]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await getAdminReviews({ 
        q: query || undefined,
        rating: ratingFilter ? Number(ratingFilter) : undefined,
        replyStatus: replyFilter || undefined,
        skip: (page - 1) * TAKE,
        take: TAKE 
      });
      setReviews(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Lỗi khi tải danh sách đánh giá:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setPage(1);
  };

  const handleOpenReply = (review: Review) => {
    setReplyingToId(review.id);
    setReplyText(review.adminReply || '');
  };

  const handleCancelReply = () => {
    setReplyingToId(null);
    setReplyText('');
  };

  const handleSubmitReply = async (id: number) => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      await replyAdminReview(id, replyText);
      setReviews((prev) => 
        prev.map((r) => r.id === id ? { ...r, adminReply: replyText } : r)
      );
      setReplyingToId(null);
      setReplyText('');
    } catch (error) {
      await modal.alert(t('err_reply'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await modal.confirm(t('confirm_delete'), 'Xác nhận'))) return;
    try {
      await deleteAdminReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setTotal((prev) => prev - 1);
    } catch (error) {
      console.error('Lỗi khi xóa:', error);
      await modal.alert(t('err_delete'));
    }
  };

  return (
    <div className="p-6 w-full max-w-7xl mx-auto">
      {/* Tiêu đề trang */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        <div className="text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
          {t('total_count')} <span className="text-[#4592b6] font-bold">{total}</span> {t('reviews')}
        </div>
      </div>

      {/* Toolbar Lọc & Tìm kiếm */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center">
        {/* Tìm kiếm */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchInput} 
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4592b6] focus:border-[#4592b6] outline-none text-sm transition"
          />
        </div>

        {/* Lọc theo Sao */}
        <div className="w-40">
          <select
            value={ratingFilter}
            onChange={(e) => handleFilterChange(setRatingFilter, e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-[#4592b6] outline-none cursor-pointer"
          >
            <option value="">{t('filter_rating_all')}</option>
            <option value="5">{t('filter_rating_5')}</option>
            <option value="4">{t('filter_rating_4')}</option>
            <option value="3">{t('filter_rating_3')}</option>
            <option value="2">{t('filter_rating_2')}</option>
            <option value="1">{t('filter_rating_1')}</option>
          </select>
        </div>

        {/* Lọc Trạng thái Phản hồi */}
        <div className="w-44">
          <select
            value={replyFilter}
            onChange={(e) => handleFilterChange(setReplyFilter, e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-[#4592b6] outline-none cursor-pointer"
          >
            <option value="">{t('filter_reply_all')}</option>
            <option value="replied">{t('filter_reply_replied')}</option>
            <option value="unreplied">{t('filter_reply_unreplied')}</option>
          </select>
        </div>
      </div>

      {/* Nội dung Review */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
          Loading...
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
          {t('empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
              
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                {/* Thông tin khách hàng và sản phẩm */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 border border-blue-100 font-bold text-lg rounded-lg flex items-center justify-center flex-shrink-0">
                    {(review.customer?.name || review.customer?.email || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-base">
                      {review.customer?.name || review.customer?.email}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {t('product')}: <span className="font-semibold text-gray-800">{review.product?.name}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-2">
                      <span>{t('order')}: <strong className="text-gray-600">#{review.order?.code}</strong></span>
                      <span>•</span>
                      <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Nút hành động (Dùng màu Soft-UI) */}
                <div className="flex items-center gap-2 self-end md:self-start">
                  <button 
                    onClick={() => handleOpenReply(review)}
                    className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition"
                  >
                    {review.adminReply ? t('btn_edit_reply') : t('btn_reply')}
                  </button>
                  <button 
                    onClick={() => handleDelete(review.id)}
                    className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition"
                  >
                    {t('btn_delete')}
                  </button>
                </div>
              </div>

              {/* Số sao và Nội dung bình luận */}
              <div className="mb-4 pl-16">
                <div className="text-yellow-400 text-lg mb-2">
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </div>
                {review.comment && (
                  <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                    {review.comment}
                  </p>
                )}
              </div>

              {/* Hình ảnh đính kèm */}
              {review.images && review.images.length > 0 && (
                <div className="flex gap-3 mb-4 pl-16 overflow-x-auto pb-2 no-scrollbar">
                  {[...new Set(review.images)].map((img, idx) => (
                    <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                      <img src={resolveImageUrl(img)} alt="Review Attachment" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Khối hiển thị Phản hồi của Admin */}
              {review.adminReply && replyingToId !== review.id && (
                <div className="mt-4 ml-16 bg-gray-50 border-l-4 border-[#4592b6] p-4 rounded-r-lg">
                  <div className="font-bold text-[11px] text-gray-500 uppercase tracking-wider mb-1.5">
                    {t('admin_reply_label')}
                  </div>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                    {review.adminReply}
                  </p>
                </div>
              )}

              {/* Khối Form nhập Phản hồi */}
              {replyingToId === review.id && (
                <div className="mt-4 ml-16 bg-[#f4f8fa] p-4 rounded-xl border border-[#bce0f0]">
                  <label className="block text-xs font-bold text-[#2a5b72] uppercase tracking-wider mb-2">
                    {t('input_label')}
                  </label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-3 rounded-lg border border-[#bce0f0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4592b6] text-sm resize-none shadow-sm"
                    rows={3}
                    placeholder={t('placeholder')}
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button 
                      onClick={handleCancelReply}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      {t('btn_cancel')}
                    </button>
                    <button 
                      onClick={() => handleSubmitReply(review.id)}
                      disabled={isSubmitting || !replyText.trim()}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#4592b6] rounded-lg hover:bg-[#387b99] transition disabled:opacity-50"
                    >
                      {isSubmitting ? t('btn_saving') : t('btn_save')}
                    </button>
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {/* Phân trang (Pagination) */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-end items-center gap-2 mt-8 pb-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm"
          >
            {t('pagination.prev')}
          </button>
          <div className="font-semibold text-gray-800 px-3 text-sm">
            {page} / {totalPages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm"
          >
            {t('pagination.next')}
          </button>
        </div>
      )}
    </div>
  );
}