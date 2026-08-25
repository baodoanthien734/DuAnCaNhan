'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { getMyOrderById } from '@/lib/orders-api';
import { deleteReview } from '@/lib/reviews-api';
import ReviewModal from '@/components/ui/ReviewModal';
import { useModal } from '@/hooks/useModal';
import { resolveImageUrl } from '@/lib/utils';

const STEPS = ['PENDING', 'PROCESSING', 'SHIPPING', 'DELIVERED'];

export default function MyOrderDetailPage() {
  const t = useTranslations('my_orders');
  const tReview = useTranslations('user_reviews'); 
  const modal = useModal();
  const locale = useLocale(); // Lấy ngôn ngữ hiện tại (vi hoặc en)
  
  const params = useParams();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [reviewData, setReviewData] = useState<{ 
    isOpen: boolean; 
    productId: number; 
    productName: string;
    existingReview?: {
      id: number;
      rating: number;
      comment: string | null;
      images: string[];
    } | null;
  } | null>(null);
  
  const [reviewedMap, setReviewedMap] = useState<{ [productId: number]: any }>({});

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await getMyOrderById(orderId);
        setOrder(data);

        if (data.reviews && Array.isArray(data.reviews)) {
          const map: { [productId: number]: any } = {};
          data.reviews.forEach((r: any) => {
            map[r.productId] = r;
          });
          setReviewedMap(map);
        }
      } catch (error) {
        console.error(t('load_error') || 'Lỗi tải đơn hàng:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, t]);

  // HÀM FORMAT TIỀN TỆ ĐỘNG THEO LOCALE
  const formatCurrency = (value: number) => {
    if (locale === 'en') {
      // 20,000 VND
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' })
        .format(Number(value || 0))
        .replace('₫', 'VND');
    }
    // 20.000 đ
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50/30">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <svg className="h-6 w-6 animate-spin text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">{t('loading')}</span>
        </div>
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50/30">
        <p className="font-medium text-rose-600">{t('detail.not_found')}</p>
      </div>
    );
  }

  const currentStepIndex = STEPS.indexOf(order.status);

  // GOM NHÓM THEO SẢN PHẨM
  const groupedItems = order.items.reduce((acc: any, item: any) => {
    if (!acc[item.productId]) {
      acc[item.productId] = {
        productId: item.productId,
        productName: item.productName,
        productSlug: item.productSlug,
        imageUrl: item.imageUrl,
        totalAmount: 0,
        purchasedDetails: [], 
      };
    }
    
    acc[item.productId].purchasedDetails.push({
      id: item.id,
      variantName: item.variantName,
      customizations: item.customizations,
      quantity: item.quantity,
      price: item.price
    });
    
    acc[item.productId].totalAmount += Number(item.price) * item.quantity;
    return acc;
  }, {});

  const groupedProducts = Object.values(groupedItems);

  const handleDeleteReview = async (reviewId: number, productId: number) => {
    if (!(await modal.confirm(tReview('confirm_delete')))) return;
    try {
      await deleteReview(reviewId);
      await modal.alert(tReview('success_delete'));
      
      setReviewedMap(prev => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
    } catch (error: any) {
      console.error(error);
      await modal.alert(error.response?.data?.message || tReview('err_action'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/30 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-4xl">
        
        {/* Nút quay lại & Tiêu đề */}
        <Link href="/orders" className="mb-6 inline-block text-sm font-medium text-slate-500 transition hover:text-slate-900">
          {t('detail.back')}
        </Link>
        <div className="mb-8 flex items-center justify-between border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {t('detail.title')} <span className="text-slate-500">#{order.code}</span>
          </h1>
        </div>

        {/* Thanh tiến độ */}
        {order.status === 'CANCELLED' ? (
          <div className="mb-8 rounded-2xl border border-rose-100 bg-rose-50 px-6 py-4 text-center font-semibold text-rose-600 shadow-sm">
            {t('detail.cancelled_msg')}
          </div>
        ) : (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="relative flex justify-between">
              <div className="absolute left-[10%] right-[10%] top-[14px] z-0 h-1 bg-slate-100 rounded-full" />
              
              {STEPS.map((step, index) => {
                const isCompleted = currentStepIndex >= index;
                const isCurrent = currentStepIndex === index;
                
                return (
                  <div key={step} className="z-10 flex w-1/4 flex-col items-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border-4 border-white text-xs font-bold shadow-sm transition-colors ${
                      isCompleted ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                    } ${isCurrent ? 'ring-4 ring-slate-100' : ''}`}>
                      {isCompleted ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className={`mt-3 text-center text-xs font-medium ${isCompleted ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                      {t(`status.${step}`)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Thông tin Giao hàng & Thanh toán */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Box Giao Hàng */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <h3 className="font-bold text-slate-900">{t('detail.shipping_info')}</h3>
            </div>
            <div className="space-y-1.5 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{order.address?.recipientName}</p>
              <p>{order.address?.phone}</p>
              <p className="leading-relaxed">
                {order.address?.street}, {order.address?.ward}, {order.address?.district}, {order.address?.city}
              </p>
            </div>
            {order.note && (
              <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                <span className="font-semibold">{t('detail.note')}</span> {order.note}
              </div>
            )}
          </div>

          {/* Box Thanh Toán */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
              <h3 className="font-bold text-slate-900">{t('detail.payment_info')}</h3>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>{t('detail.payment_method')}</span>
                <span className="font-semibold text-slate-900">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('detail.payment_status')}</span>
                <span className={`font-bold ${order.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {order.paymentStatus === 'PAID' ? t('detail.paid') : t('detail.unpaid')}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3">
                <span>{t('order_date')}</span>
                <span className="font-medium text-slate-900">
                  {new Date(order.createdAt).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CẤU TRÚC LẠI DANH SÁCH SẢN PHẨM THEO ẢNH THAM KHẢO */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <h3 className="font-bold text-slate-900">{t('detail.products')}</h3>
          </div>
          
          <div className="divide-y divide-slate-100">
            {groupedProducts.map((group: any) => {
              const existingReview = reviewedMap[group.productId];

              return (
                <div key={group.productId} className="flex flex-col gap-4 p-6 sm:flex-row">
                  
                  {/* Cột 1: Ảnh sản phẩm (Hình vuông, viền mỏng như ảnh) */}
                  <Link href={group.productSlug ? `/products/${group.productSlug}` : '#'} className="shrink-0">
                    <div className="flex h-[100px] w-[100px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm p-1">
                      {group.imageUrl ? (
                        <img src={resolveImageUrl(group.imageUrl)} alt={group.productName} className="h-full w-full object-cover rounded-lg" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-slate-300">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                        </svg>
                      )}
                    </div>
                  </Link>

                  {/* Cột 2: Nội dung & Giá (Trải dài hết không gian còn lại) */}
                  <div className="flex flex-col flex-grow w-full">
                    
                    {/* Header: Tên sản phẩm bên trái, Tổng tiền bên phải */}
                    <div className="flex justify-between items-start mb-3">
                      <Link href={group.productSlug ? `/products/${group.productSlug}` : '#'} className="text-base font-bold text-slate-900 hover:text-slate-600 transition-colors">
                        {group.productName}
                      </Link>
                      <div className="text-lg font-bold text-slate-900 ml-4 whitespace-nowrap">
                        {formatCurrency(group.totalAmount)}
                      </div>
                    </div>
                    
                    {/* Danh sách biến thể (Có thanh viền dọc bên trái giống ảnh) */}
                    <div className="space-y-3 border-l-2 border-slate-100 pl-3 mb-4">
                      {group.purchasedDetails.map((detail: any, idx: number) => (
                        <div key={idx} className="flex flex-col gap-1">
                          
                          {/* Dòng biến thể & Đơn giá */}
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">
                              {detail.variantName || 'Mặc định'} <span className="text-slate-400">x{detail.quantity}</span>
                            </span>
                            <span className="text-slate-500 text-xs mt-0.5">{formatCurrency(Number(detail.price) * detail.quantity)}</span>
                          </div>
                          
                          {/* Customizations dưới dạng badge */}
                          {detail.customizations && Array.isArray(detail.customizations) && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {detail.customizations.map((c: any, cIdx: number) => (
                                <div key={cIdx} className="inline-flex items-center rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-600 border border-slate-100">
                                  <span>{c.name}:</span>
                                  <strong className="ml-1 text-slate-900">{c.value}</strong>
                                  {c.extraPrice > 0 ? <span className="ml-1 text-amber-600">(+{formatCurrency(c.extraPrice)})</span> : ''}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Các nút hành động (Được đẩy xuống dưới cùng, dạt sang phải) */}
                    <div className="mt-auto flex justify-end gap-3 pt-2">
                      {order.status === 'DELIVERED' && (
                        existingReview ? (
                          <>
                            <button
                              onClick={() => setReviewData({ isOpen: true, productId: group.productId, productName: group.productName, existingReview: existingReview })}
                              className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                            >
                              {tReview('btn_edit') || 'Edit Review'}
                            </button>
                            <button
                              onClick={() => handleDeleteReview(existingReview.id, group.productId)}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-2 text-sm font-semibold text-rose-600 shadow-sm transition-all hover:bg-rose-100"
                            >
                              {tReview('btn_delete') || 'Delete'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setReviewData({ isOpen: true, productId: group.productId, productName: group.productName, existingReview: null })}
                            className="rounded-xl bg-slate-900 px-6 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800"
                          >
                            {tReview('btn_review') || 'Write Review'}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dòng Total dưới cùng */}
          <div className="flex items-center justify-between bg-slate-50 p-6">
            <span className="text-lg font-bold text-slate-700">Total:</span>
            <span className="text-3xl font-bold text-slate-900">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
        </div>

      </div>

      {/* COMPONENT MODAL ĐÁNH GIÁ */}
      {reviewData && (
        <ReviewModal
          isOpen={reviewData.isOpen}
          onClose={() => setReviewData(null)}
          productId={reviewData.productId}
          orderId={order.id}
          productName={reviewData.productName}
          existingReview={reviewData.existingReview}
          onSuccess={(savedReview) => {
            const fallbackReview = reviewData.existingReview
              ? {
                  ...reviewData.existingReview,
                  rating: savedReview?.rating ?? reviewData.existingReview.rating,
                  comment: savedReview?.comment ?? reviewData.existingReview.comment,
                  images: savedReview?.images ?? reviewData.existingReview.images,
                }
              : null;
            const nextReview = savedReview || fallbackReview;
            if (!nextReview) return;
            setReviewedMap(prev => ({
              ...prev,
              [reviewData.productId]: nextReview
            }));
          }}
        />
      )}
    </div>
  );
}