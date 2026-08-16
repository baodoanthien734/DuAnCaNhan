'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getAdminOrders } from '@/lib/admin-orders-api';

export default function AdminOrdersPage() {
  const t = useTranslations('admin_orders'); // Kéo bộ từ điển admin_orders vào
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await getAdminOrders();
        setOrders(res.items || []);
      } catch (error) {
        console.error('Lỗi khi tải danh sách đơn hàng:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>{t('loading_list')}</div>;
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#111827' }}>
          {t('list_title')}
        </h1>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '16px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>{t('table.order_code')}</th>
                <th style={{ padding: '16px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>{t('table.customer')}</th>
                <th style={{ padding: '16px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>{t('table.order_date')}</th>
                <th style={{ padding: '16px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>{t('table.total')}</th>
                <th style={{ padding: '16px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>{t('table.status')}</th>
                <th style={{ padding: '16px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>{t('table.action')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    {t('empty_list')}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px', fontWeight: '600', color: '#111827' }}>{order.code}</td>
                    <td style={{ padding: '16px', color: '#4b5563' }}>
                      {order.address?.recipientName}<br/>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>{order.address?.phone}</span>
                    </td>
                    <td style={{ padding: '16px', color: '#4b5563', fontSize: '14px' }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px', fontWeight: '600', color: '#b45309' }}>
                      {Number(order.totalAmount).toLocaleString()} đ
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', backgroundColor: '#f3f4f6', color: '#374151' }}>
                        {/* Lấy label trạng thái từ i18n thông qua object key */}
                        {t(`status.${order.status}`)}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Link 
                        href={`/admin/orders/${order.id}`}
                        style={{ padding: '6px 12px', backgroundColor: '#111827', color: '#fff', borderRadius: '6px', fontSize: '13px', textDecoration: 'none' }}
                      >
                        {t('table.detail_btn')}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}