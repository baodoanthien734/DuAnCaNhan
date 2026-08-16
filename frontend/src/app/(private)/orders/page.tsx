'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getMyOrders } from '@/lib/orders-api';
import { resolveProductImageUrl } from '@/lib/products-api';

export default function MyOrdersPage() {
  const t = useTranslations('my_orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await getMyOrders();
        setOrders(data || []);
      } catch (error) {
        console.error('Lỗi tải đơn hàng:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>{t('loading')}</div>;
  }

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', padding: '40px 20px', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>{t('title')}</h1>
          <Link href="/profile" style={{ fontSize: '14px', color: '#4b5563', textDecoration: 'none' }}>
            Quản lý tài khoản
          </Link>
        </div>

        {orders.length === 0 ? (
          <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>{t('empty')}</p>
            <Link href="/" style={{ backgroundColor: '#111827', color: '#fff', padding: '10px 20px', borderRadius: '999px', textDecoration: 'none', fontWeight: '600' }}>
              {t('shop_now')}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {orders.map((order) => (
              <div key={order.id} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#111827' }}>{t('order_code')} {order.code}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                      {t('order_date')} {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', backgroundColor: order.status === 'CANCELLED' ? '#fee2e2' : '#f3f4f6', color: order.status === 'CANCELLED' ? '#b91c1c' : '#374151' }}>
                      {t(`status.${order.status}`)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* Hiển thị tối đa 2 hình ảnh sản phẩm */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {order.items.slice(0, 2).map((item: any, idx: number) => (
                      <div key={idx} style={{ width: '60px', height: '60px', borderRadius: '8px', backgroundColor: '#f3f4f6', overflow: 'hidden', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.imageUrl ? (
                          <img src={resolveProductImageUrl(item.imageUrl)} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '20px' }}>📦</span>
                        )}
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <div style={{ width: '60px', height: '60px', borderRadius: '8px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>
                        +{order.items.length - 2}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{t('total_amount')}</div>
                    <div style={{ fontWeight: 'bold', color: '#b45309', fontSize: '16px', marginBottom: '8px' }}>
                      {Number(order.totalAmount).toLocaleString()} đ
                    </div>
                    <Link href={`/orders/${order.id}`} style={{ fontSize: '13px', color: '#111827', fontWeight: '600', textDecoration: 'underline' }}>
                      {t('view_detail')}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}