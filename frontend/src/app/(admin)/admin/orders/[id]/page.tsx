'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getAdminOrderById, updateOrderStatus } from '@/lib/admin-orders-api';
import { useModal } from '@/hooks/useModal';

export default function AdminOrderDetailPage() {
  const t = useTranslations('admin_orders');
  const modal = useModal();
  const params = useParams();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    getAdminOrderById(orderId).then(setOrder).catch(console.error).finally(() => setLoading(false));
  }, [orderId]);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrder({ ...order, status: newStatus });
      modal.alert(t('detail.success_update'));
    } catch (error) {
      modal.alert(t('detail.error_update'));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">{t('detail.loading')}</div>;
  if (!order) return <div className="p-8 text-center text-gray-500">{t('detail.not_found')}</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <Link href="/admin/orders" className="text-sm text-gray-500 hover:text-blue-600 transition"> {t('detail.back')}</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{t('detail.title')}: #{order.code}</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-600">{t('detail.update_status')}</span>
          <select
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={updating}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-[#4592b6] outline-none"
          >
            {['PENDING', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'].map(s => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Info Cards */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">{t('detail.shipping_info')}</h3>
          <p className="text-sm text-gray-600 mb-1"><strong>{t('detail.recipient')}:</strong> {order.address?.recipientName}</p>
          <p className="text-sm text-gray-600 mb-1"><strong>{t('detail.phone')}:</strong> {order.address?.phone}</p>
          <p className="text-sm text-gray-600"><strong>{t('detail.address')}:</strong> {order.address?.street}, {order.address?.ward}, {order.address?.district}, {order.address?.city}</p>
          {order.note && <div className="mt-4 p-3 bg-amber-50 text-amber-800 text-sm rounded-lg border border-amber-100 italic">"{order.note}"</div>}
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">{t('detail.payment_info')}</h3>
          <p className="text-sm text-gray-600 mb-1"><strong>{t('detail.method')}:</strong> {order.paymentMethod}</p>
          <p className="text-sm text-gray-600 mb-1">
            <strong>{t('detail.payment_status')}:</strong> 
            <span className={`ml-2 font-bold ${order.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-red-600'}`}>
              {order.paymentStatus === 'PAID' ? t('detail.paid') : t('detail.unpaid')}
            </span>
          </p>
          <p className="text-sm text-gray-400 mt-2">{t('detail.order_date')}: {new Date(order.createdAt).toLocaleString()}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">{t('detail.products')} ({order.items.length})</h3>
        <table className="w-full text-sm text-left">
          <thead className="text-gray-500 uppercase text-xs">
            <tr>
              <th className="py-3">{t('detail.product_name')}</th>
              <th className="py-3">{t('detail.price')}</th>
              <th className="py-3">{t('detail.quantity')}</th>
              <th className="py-3 text-right">{t('detail.subtotal')}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item: any) => (
              <tr key={item.id} className="border-t border-gray-50">
                <td className="py-4">
                  <div className="font-semibold">{item.productName}</div>
                  {item.variantName && <div className="text-xs text-gray-500">{t('detail.variant')}: {item.variantName}</div>}
                </td>
                <td className="py-4 text-gray-600">{Number(item.price).toLocaleString()}đ</td>
                <td className="py-4 text-gray-600">{item.quantity}</td>
                <td className="py-4 text-right font-bold text-amber-700">{(Number(item.price) * item.quantity).toLocaleString()}đ</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-right mt-6 pt-4 border-t border-gray-100">
          <span className="text-lg font-bold">{t('detail.total_amount')}: </span>
          <span className="text-2xl font-bold text-[#4592b6] ml-2">{Number(order.totalAmount).toLocaleString()}đ</span>
        </div>
      </div>
    </div>
  );
}