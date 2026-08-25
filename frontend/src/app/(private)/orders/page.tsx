'use client';

import { useEffect, useState, useCallback } from 'react'; 
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl'; 
import { getMyOrders, cancelMyOrder } from '@/lib/orders-api'; 
import { resolveImageUrl } from '@/lib/utils';
import { useModal } from '@/hooks/useModal';

export default function MyOrdersPage() {
  const t = useTranslations('my_orders');
  const locale = useLocale(); 
  const modal = useModal(); 

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0); 

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyOrders();
      setOrders(data || []);
    } catch (error) {
      console.error(t('load_error') || 'Lỗi tải đơn hàng:', error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, refreshTrigger]);

  const formatCurrency = (value: number) => {
    if (locale === 'en') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' })
        .format(Number(value || 0))
        .replace('₫', 'VND');
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
  };

  const handleCancelOrder = async (orderId: number, orderCode: string) => {
    const isConfirmed = await modal.confirm(
      t('confirm_cancel', { code: orderCode }) || `Bạn có chắc chắn muốn hủy đơn hàng #${orderCode} không?`
    );

    if (isConfirmed) {
      try {
        await cancelMyOrder(orderId);
        await modal.alert(t('cancel_success') || 'Đơn hàng đã được hủy thành công.');
        setRefreshTrigger(prev => prev + 1); 
      } catch (error: any) {
        const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra khi hủy đơn.';
        await modal.alert(errorMsg);
      }
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50/30">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          {/* FIX 1: Khóa cứng width/height cho icon Loading */}
          <svg width="24" height="24" className="h-6 w-6 animate-spin text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">{t('loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/30 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-4xl">
        
        {/* HEADER */}
        <div className="mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('title')}</h1>
        </div>

        {/* DANH SÁCH ĐƠN HÀNG */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-24 shadow-sm">
            {/* FIX 2: Khóa cứng width/height cho icon Giỏ hàng rỗng */}
            <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mb-6 h-16 w-16 text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <p className="mb-6 text-slate-500">{t('empty')}</p>
            <Link 
              href="/products" 
              className="rounded-xl bg-slate-900 px-8 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-slate-800"
            >
              {t('shop_now')}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div 
                key={order.id} 
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* HEADER CỦA TỪNG ĐƠN HÀNG */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t('order_code')}</span>
                      <span className="text-lg font-bold text-slate-900">#{order.code}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      {/* FIX 3: Khóa cứng width/height cho icon Đồng hồ (KẺ GÂY LỖI CHÍNH) */}
                      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('order_date')} {new Date(order.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN')}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                      order.status === 'CANCELLED' 
                        ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                        : 'bg-white text-slate-700 border border-slate-200 shadow-sm'
                    }`}>
                      {t(`status.${order.status}`)}
                    </span>
                    
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => handleCancelOrder(order.id, order.code)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold uppercase text-red-600 shadow-sm transition hover:bg-red-100 hover:text-red-700"
                      >
                        {t('cancel_button') || 'Hủy Đơn'}
                      </button>
                    )}
                  </div>
                </div>

                {/* BODY CỦA TỪNG ĐƠN HÀNG */}
                <div className="flex flex-wrap items-center justify-between gap-6 p-6">
                  {/* Cột Trái: Hình ảnh */}
                  <div className="flex gap-3">
                    {order.items.slice(0, 2).map((item: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="relative flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                      >
                        {item.imageUrl ? (
                          <img 
                            src={resolveImageUrl(item.imageUrl)} 
                            alt={item.productName} 
                            width={80} 
                            height={80} 
                            className="absolute inset-0 h-full w-full object-cover mix-blend-multiply" 
                          />
                        ) : (
                          <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-slate-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                          </svg>
                        )}
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <div className="flex h-20 w-20 flex-none items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-500">
                        +{order.items.length - 2}
                      </div>
                    )}
                  </div>

                  {/* Cột Phải: Tổng tiền & Nút xem */}
                  <div className="flex flex-col items-end gap-3 text-right">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">{t('total_amount')}</div>
                      <div className="mt-1 text-2xl font-bold text-slate-900">
                        {formatCurrency(order.totalAmount)}
                      </div>
                    </div>
                    
                    <Link 
                      href={`/orders/${order.id}`} 
                      className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
                    >
                      {t('view_detail')}
                      {/* FIX 5: Khóa cứng width/height cho Mũi tên */}
                      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
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