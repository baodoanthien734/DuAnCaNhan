'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
  
  const params = useParams();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State mở Modal: Bổ sung thêm existingReview để truyền dữ liệu khi sửa
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
  
  // State lưu trữ những ID sản phẩm đã được đánh giá thành công hoặc thông tin review của chúng
  const [reviewedMap, setReviewedMap] = useState<{ [productId: number]: any }>({});

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await getMyOrderById(orderId);
        setOrder(data);

        // Map dữ liệu đánh giá từ Backend trả về vào state reviewedMap
        if (data.reviews && Array.isArray(data.reviews)) {
          const map: { [productId: number]: any } = {};
          data.reviews.forEach((r: any) => {
            // Lưu review ứng với productId tương ứng trong đơn hàng này
            map[r.productId] = r;
          });
          setReviewedMap(map);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>{t('loading')}</div>;
  if (!order) return <div style={{ padding: '60px', textAlign: 'center', color: '#b91c1c' }}>{t('detail.not_found')}</div>;

  const currentStepIndex = STEPS.indexOf(order.status);

  // =================================================================
  // THUẬT TOÁN GOM NHÓM THEO SẢN PHẨM (PRODUCT ID)
  // =================================================================
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

  // Hàm xử lý Xóa đánh giá
  const handleDeleteReview = async (reviewId: number, productId: number) => {
    if (!(await modal.confirm(tReview('confirm_delete')))) return;
    try {
      await deleteReview(reviewId);
      await modal.alert(tReview('success_delete'));
      
      // Xóa khỏi state để nút bấm chuyển lại thành "Đánh giá sản phẩm"
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
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', padding: '40px 20px', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Nút quay lại & Tiêu đề */}
        <Link href="/orders" style={{ fontSize: '14px', color: '#4b5563', textDecoration: 'none', display: 'inline-block', marginBottom: '16px' }}>
          {t('detail.back')}
        </Link>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 24px' }}>
          {t('detail.title')} #{order.code}
        </h1>

        {/* Thanh tiến độ trạng thái */}
        {order.status === 'CANCELLED' ? (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontWeight: '600', textAlign: 'center' }}>
            {t('detail.cancelled_msg')}
          </div>
        ) : (
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '14px', left: '10%', right: '10%', height: '2px', backgroundColor: '#e5e7eb', zIndex: 0 }} />
              
              {STEPS.map((step, index) => {
                const isCompleted = currentStepIndex >= index;
                return (
                  <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, width: '25%' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: isCompleted ? '#166534' : '#e5e7eb', color: isCompleted ? '#fff' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', border: '4px solid #fff' }}>
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '8px', color: isCompleted ? '#111827' : '#9ca3af', fontWeight: isCompleted ? '600' : '400', textAlign: 'center' }}>
                      {t(`status.${step}`)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Thông tin Giao hàng & Thanh toán */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px' }}>{t('detail.shipping_info')}</h3>
            <p style={{ margin: '4px 0', fontSize: '14px', color: '#374151' }}><strong>{order.address?.recipientName}</strong></p>
            <p style={{ margin: '4px 0', fontSize: '14px', color: '#4b5563' }}>{order.address?.phone}</p>
            <p style={{ margin: '4px 0', fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>
              {order.address?.street}, {order.address?.ward}, {order.address?.district}, {order.address?.city}
            </p>
            {order.note && <p style={{ margin: '12px 0 0', fontSize: '13px', color: '#b45309', backgroundColor: '#fef3c7', padding: '8px', borderRadius: '6px' }}>{t('detail.note')} {order.note}</p>}
          </div>

          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px' }}>{t('detail.payment_info')}</h3>
            <p style={{ margin: '8px 0', fontSize: '14px' }}>{t('detail.payment_method')} <strong>{order.paymentMethod}</strong></p>
            <p style={{ margin: '8px 0', fontSize: '14px' }}>
              {t('detail.payment_status')}{' '}
              <strong style={{ color: order.paymentStatus === 'PAID' ? '#166534' : '#b45309' }}>
                {order.paymentStatus === 'PAID' ? t('detail.paid') : t('detail.unpaid')}
              </strong>
            </p>
            <p style={{ margin: '8px 0', fontSize: '13px', color: '#6b7280' }}>
              {t('order_date')} {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Danh sách Sản phẩm (Đã gom nhóm) */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 16px' }}>{t('detail.products')}</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {groupedProducts.map((group: any) => {
              
              // Kiểm tra xem sản phẩm này đã được đánh giá chưa dựa trên reviewedMap
              const existingReview = reviewedMap[group.productId];

              return (
                <div key={group.productId} style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '20px' }}>
                  
                  {/* Ảnh sản phẩm */}
                  <Link href={group.productSlug ? `/products/${group.productSlug}` : '#'} style={{ flexShrink: 0 }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '8px', backgroundColor: '#f3f4f6', overflow: 'hidden', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {group.imageUrl ? (
                        <img src={resolveImageUrl(group.imageUrl)} alt={group.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '24px' }}>📦</span>
                      )}
                    </div>
                  </Link>

                  <div style={{ flexGrow: 1 }}>
                    {/* Tên Sản phẩm */}
                    <Link href={group.productSlug ? `/products/${group.productSlug}` : '#'} style={{ fontWeight: '700', color: '#111827', fontSize: '16px', textDecoration: 'none', display: 'block', marginBottom: '8px' }}>
                      {group.productName}
                    </Link>
                    
                    {/* Cây Biến thể & Tùy chọn */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '12px', borderLeft: '2px solid #e5e7eb' }}>
                      {group.purchasedDetails.map((detail: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '13px', color: '#4b5563' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '500', color: '#374151' }}>
                              {detail.variantName || 'Mặc định'} (x{detail.quantity})
                            </span>
                            <span style={{ color: '#6b7280' }}>{(Number(detail.price) * detail.quantity).toLocaleString()} đ</span>
                          </div>
                          
                          {/* Customizations */}
                          {detail.customizations && Array.isArray(detail.customizations) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                              {detail.customizations.map((c: any, cIdx: number) => (
                                <div key={cIdx} style={{ fontSize: '11px', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>
                                  <span style={{ color: '#6b7280' }}>{c.name}:</span> <strong style={{ color: '#111827' }}>{c.value}</strong>
                                  {c.extraPrice > 0 ? ` (+${c.extraPrice.toLocaleString()}đ)` : ''}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tổng tiền & Nút hành động (Đánh giá hoặc Sửa/Xóa) */}
                  <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 'bold', color: '#b45309', fontSize: '16px' }}>
                      {group.totalAmount.toLocaleString()} đ
                    </div>
                    
                    {order.status === 'DELIVERED' && (
                      existingReview ? (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                          <button
                            onClick={() => setReviewData({ 
                              isOpen: true, 
                              productId: group.productId, 
                              productName: group.productName,
                              existingReview: existingReview 
                            })}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#374151',
                              backgroundColor: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            {tReview('btn_edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteReview(existingReview.id, group.productId)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#b91c1c',
                              backgroundColor: '#fee2e2',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            {tReview('btn_delete')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReviewData({ 
                            isOpen: true, 
                            productId: group.productId, 
                            productName: group.productName,
                            existingReview: null 
                          })}
                          style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#2563eb',
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '8px',
                            cursor: 'pointer',
                          }}
                        >
                          {tReview('btn_review')}
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px' }}>
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>{t('total_amount')}</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#b45309' }}>
              {Number(order.totalAmount).toLocaleString()} đ
            </span>
          </div>
        </div>

      </div>

      {/* COMPONENT MODAL ĐÁNH GIÁ (DÙNG CHUNG CHO CẢ TẠO MỚI VÀ SỬA) */}
      {reviewData && (
        <ReviewModal
          isOpen={reviewData.isOpen}
          onClose={() => setReviewData(null)}
          productId={reviewData.productId}
          orderId={order.id}
          productName={reviewData.productName}
          existingReview={reviewData.existingReview}
          onSuccess={(savedReview) => {
            // Cập nhật lại state bằng dữ liệu thật từ backend để tránh id giả hoặc ảnh sai trạng thái.
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