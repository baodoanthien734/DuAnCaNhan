'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { getAdminReviews, replyAdminReview, deleteAdminReview } from '@/lib/admin-reviews-api';
import { useModal } from '@/hooks/useModal';

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

export default function AdminReviewsPage() {
  const t = useTranslations('admin_reviews');
  const modal = useModal();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await getAdminReviews({ take: 50 });
      setReviews(data.items || []);
    } catch (error) {
      console.error('Lỗi khi tải danh sách đánh giá:', error);
    } finally {
      setLoading(false);
    }
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
    if (!(await modal.confirm(t('confirm_delete')))) return;
    try {
      await deleteAdminReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Lỗi khi xóa:', error);
      await modal.alert(t('err_delete'));
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      {/* Tiêu đề trang */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý và phản hồi đánh giá sản phẩm từ khách hàng</p>
        </div>
        <div className="text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
          Tổng số: <span className="text-blue-600 font-bold">{reviews.length}</span> đánh giá
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 text-center text-gray-500">
          {t('empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-gray-300 transition">
              
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                {/* Thông tin khách hàng và sản phẩm */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 text-gray-700 font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {(review.customer?.name || review.customer?.email || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-base">
                      {review.customer?.name || review.customer?.email}
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      {t('product')}: <span className="font-semibold text-gray-800">{review.product?.name}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <span>{t('order')}: <strong className="text-gray-600">#{review.order?.code}</strong></span>
                      <span>•</span>
                      <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Nút hành động */}
                <div className="flex items-center gap-2 self-end md:self-start">
                  <button 
                    onClick={() => handleOpenReply(review)}
                    className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition"
                  >
                    {review.adminReply ? t('btn_edit_reply') : t('btn_reply')}
                  </button>
                  <button 
                    onClick={() => handleDelete(review.id)}
                    className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition"
                  >
                    {t('btn_delete')}
                  </button>
                </div>
              </div>

              {/* Số sao và Nội dung bình luận */}
              <div className="mb-4 pl-13">
                <div className="text-yellow-400 text-base mb-1.5">
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
                <div className="flex gap-3 mb-4 pl-13 overflow-x-auto pb-2">
                  {[...new Set(review.images)].map((img, idx) => (
                    <div key={idx} className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                      <img src={img} alt="Review Attachment" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Khối hiển thị Phản hồi của Admin */}
              {review.adminReply && replyingToId !== review.id && (
                <div className="mt-4 ml-13 bg-gray-50 border-l-4 border-gray-900 p-4 rounded-r-xl">
                  <div className="font-semibold text-xs text-gray-900 uppercase tracking-wider mb-1">
                    {t('admin_reply_label')}
                  </div>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">
                    {review.adminReply}
                  </p>
                </div>
              )}

              {/* Khối Form nhập Phản hồi */}
              {replyingToId === review.id && (
                <div className="mt-4 ml-13 bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                  <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">
                    {t('input_label')}
                  </label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-3 rounded-xl border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none shadow-sm"
                    rows={3}
                    placeholder={t('placeholder')}
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button 
                      onClick={handleCancelReply}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                    >
                      {t('btn_cancel')}
                    </button>
                    <button 
                      onClick={() => handleSubmitReply(review.id)}
                      disabled={isSubmitting || !replyText.trim()}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
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
    </div>
  );
}