'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getProductReviews } from '@/lib/reviews-api';

interface ProductReviewsProps {
  productId: number;
}

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  images: string[];
  adminReply: string | null;
  createdAt: string;
  customer: {
    name: string;
    email: string;
  };
};

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const t = useTranslations('public_reviews');
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await getProductReviews(productId, { take: 20 }); // Lấy 20 đánh giá mới nhất
        setReviews(data.items || []);
        setTotal(data.total || 0);
        setAverageRating(data.averageRating || 0);
      } catch (error) {
        console.error('Lỗi khi lấy đánh giá:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [productId]);

  // Hàm ẩn một phần tên khách hàng để bảo mật (VD: Nguyễn Văn A -> Nguy*** A)
  const maskName = (name: string) => {
    if (!name) return 'Khách hàng';
    if (name.length <= 3) return name + '***';
    return name.substring(0, 3) + '***' + name.substring(name.length - 1);
  };

  if (loading) {
    return <div className="mt-12 text-center text-gray-500 py-8">Đang tải đánh giá...</div>;
  }

  return (
    <div className="mt-16 border-t border-gray-200 pt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">{t('title')}</h2>

      {total === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500">
          {t('empty')}
        </div>
      ) : (
        <div>
          {/* Tổng quan Đánh giá */}
          <div className="flex items-center gap-6 mb-8 bg-yellow-50 p-6 rounded-2xl">
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-600 mb-1">
                {Number(averageRating).toFixed(1)}
              </div>
              <div className="text-yellow-400 text-xl">
                {'★'.repeat(Math.round(averageRating))}{'☆'.repeat(5 - Math.round(averageRating))}
              </div>
            </div>
            <div className="text-gray-600">
              <span className="font-semibold text-gray-900">{total}</span> {t('reviews_count')}
            </div>
          </div>

          {/* Danh sách Đánh giá */}
          <div className="space-y-8">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-100 pb-8 last:border-0">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar mặc định */}
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold">
                      {(review.customer?.name || 'K')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">
                        {maskName(review.customer?.name || review.customer?.email)}
                      </div>
                      <div className="text-yellow-400 text-sm mt-0.5">
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Nội dung Comment */}
                {review.comment && (
                  <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed mt-3">
                    {review.comment}
                  </p>
                )}

                {/* Hình ảnh đính kèm */}
                {review.images && review.images.length > 0 && (
                  <div className="flex gap-3 mt-4 overflow-x-auto">
                    {review.images.map((img, idx) => (
                      <div key={idx} className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200">
                        <img src={img} alt="Review image" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Phản hồi từ Admin */}
                {review.adminReply && (
                  <div className="mt-4 ml-8 bg-gray-50 border-l-4 border-gray-800 p-4 rounded-r-xl">
                    <div className="font-semibold text-sm text-gray-900 mb-1">
                      {t('admin_reply')}
                    </div>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">
                      {review.adminReply}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}