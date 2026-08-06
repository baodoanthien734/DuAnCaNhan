'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getMyOrderById } from '@/lib/orders-api';

const STEPS = ['PENDING', 'PROCESSING', 'SHIPPING', 'DELIVERED'];

export default function MyOrderDetailPage() {
  const t = useTranslations('my_orders');
  const params = useParams();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await getMyOrderById(orderId);
        setOrder(data);
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

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', padding: '40px 20px', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
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
              {/* Đường Line chìm */}
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

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 16px' }}>{t('detail.products')}</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {order.items.map((item: any) => (
              <div key={item.id} style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
                {/* Ảnh có gắn Link */}
                <Link href={item.productSlug ? `/products/${item.productSlug}` : '#'} style={{ flexShrink: 0 }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '8px', backgroundColor: '#f3f4f6', overflow: 'hidden', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '24px' }}>📦</span>
                    )}
                  </div>
                </Link>

                <div style={{ flexGrow: 1 }}>
                  {/* Tên sản phẩm có gắn Link */}
                  <Link href={item.productSlug ? `/products/${item.productSlug}` : '#'} style={{ fontWeight: '600', color: '#111827', fontSize: '15px', textDecoration: 'none', display: 'block', marginBottom: '4px' }}>
                    {item.productName}
                  </Link>
                  
                  {item.variantName && <div style={{ fontSize: '13px', color: '#6b7280' }}>{item.variantName}</div>}
                  
                  {item.customizations && Array.isArray(item.customizations) && (
                    <div style={{ marginTop: '6px' }}>
                      {item.customizations.map((c: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '12px', color: '#4b5563', backgroundColor: '#f3f4f6', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', marginRight: '6px', marginBottom: '4px' }}>
                          {c.name}: <strong>{c.value}</strong> {c.extraPrice > 0 ? `(+${c.extraPrice.toLocaleString()}đ)` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 'bold', color: '#b45309', fontSize: '15px' }}>
                    {Number(item.price).toLocaleString()} đ
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                    {t('detail.qty')}: {item.quantity}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px' }}>
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>{t('total_amount')}</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#b45309' }}>
              {Number(order.totalAmount).toLocaleString()} đ
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}