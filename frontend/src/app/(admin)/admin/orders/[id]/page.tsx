'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getAdminOrderById, updateOrderStatus } from '@/lib/admin-orders-api';

export default function AdminOrderDetailPage() {
  const t = useTranslations('admin_orders');
  const params = useParams();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Vì dùng hook t() nên cấu trúc OPTIONS sẽ được khai báo ngay trong component
  const STATUS_OPTIONS = [
    { value: 'PENDING', label: t('status.PENDING') },
    { value: 'PROCESSING', label: t('status.PROCESSING') },
    { value: 'SHIPPING', label: t('status.SHIPPING') },
    { value: 'DELIVERED', label: t('status.DELIVERED') },
    { value: 'CANCELLED', label: t('status.CANCELLED') },
  ];

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await getAdminOrderById(orderId);
        setOrder(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrder({ ...order, status: newStatus });
      alert(t('detail.success_update'));
    } catch (error) {
      alert(t('detail.error_update'));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>{t('detail.loading')}</div>;
  if (!order) return <div style={{ padding: '40px', textAlign: 'center' }}>{t('detail.not_found')}</div>;

  return (
    <div style={{ padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <Link href="/admin/orders" style={{ fontSize: '14px', color: '#4b5563', textDecoration: 'none' }}>
              {t('detail.back')}
            </Link>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px', color: '#111827' }}>
              {t('detail.title')}: {order.code}
            </h1>
          </div>
          
          {/* Nơi Admin đổi trạng thái */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: '600', fontSize: '14px' }}>{t('detail.update_status')}</span>
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updating}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', fontWeight: '600' }}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          {/* Thông tin khách hàng & Giao hàng */}
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
              {t('detail.shipping_info')}
            </h3>
            <p style={{ margin: '8px 0', fontSize: '14px' }}><strong>{t('detail.recipient')}:</strong> {order.address?.recipientName}</p>
            <p style={{ margin: '8px 0', fontSize: '14px' }}><strong>{t('detail.phone')}:</strong> {order.address?.phone}</p>
            <p style={{ margin: '8px 0', fontSize: '14px' }}><strong>{t('detail.address')}:</strong> {order.address?.street}, {order.address?.ward}, {order.address?.district}, {order.address?.city}</p>
            {order.note && (
              <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '6px', fontSize: '14px' }}>
                <strong>{t('detail.customer_note')}:</strong> {order.note}
              </div>
            )}
          </div>

          {/* Thông tin Thanh toán */}
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
              {t('detail.payment_info')}
            </h3>
            <p style={{ margin: '8px 0', fontSize: '14px' }}><strong>{t('detail.method')}:</strong> {order.paymentMethod}</p>
            <p style={{ margin: '8px 0', fontSize: '14px' }}>
              <strong>{t('detail.payment_status')}:</strong>{' '}
              <span style={{ color: order.paymentStatus === 'PAID' ? 'green' : 'red', fontWeight: 'bold' }}>
                {order.paymentStatus === 'PAID' ? t('detail.paid') : t('detail.unpaid')}
              </span>
            </p>
            <p style={{ margin: '8px 0', fontSize: '14px', color: '#6b7280' }}>
              {t('detail.order_date')}: {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Danh sách sản phẩm mua */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
            {t('detail.products')} ({order.items.length})
          </h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '14px' }}>
                <th style={{ paddingBottom: '12px' }}>{t('detail.product_name')}</th>
                <th style={{ paddingBottom: '12px' }}>{t('detail.price')}</th>
                <th style={{ paddingBottom: '12px' }}>{t('detail.quantity')}</th>
                <th style={{ paddingBottom: '12px', textAlign: 'right' }}>{t('detail.subtotal')}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: any) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px 0' }}>
                    <div style={{ fontWeight: '600', color: '#111827', fontSize: '15px' }}>{item.productName}</div>
                    {item.variantName && <div style={{ fontSize: '13px', color: '#6b7280' }}>{t('detail.variant')}: {item.variantName}</div>}
                    
                    {/* Hiển thị Tùy chọn cá nhân hóa */}
                    {item.customizations && Array.isArray(item.customizations) && (
                      <div style={{ marginTop: '4px' }}>
                        {item.customizations.map((c: any, idx: number) => (
                          <div key={idx} style={{ fontSize: '12px', color: '#4b5563', backgroundColor: '#f3f4f6', display: 'inline-block', padding: '2px 6px', borderRadius: '4px', marginRight: '6px', marginBottom: '4px' }}>
                            {c.name}: <strong>{c.value}</strong> {c.extraPrice > 0 ? `(+${c.extraPrice.toLocaleString()}đ)` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px 0', color: '#4b5563' }}>{Number(item.price).toLocaleString()} đ</td>
                  <td style={{ padding: '16px 0', color: '#4b5563' }}>{item.quantity}</td>
                  <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: 'bold', color: '#b45309' }}>
                    {(Number(item.price) * item.quantity).toLocaleString()} đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ textAlign: 'right', marginTop: '20px', fontSize: '18px' }}>
            {t('detail.total_amount')}: <strong style={{ color: '#b45309', fontSize: '24px' }}>{Number(order.totalAmount).toLocaleString()} đ</strong>
          </div>
        </div>

      </div>
    </div>
  );
}