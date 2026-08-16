'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { getAdminOrders } from '@/lib/admin-orders-api';

const TAKE = 12;

export default function AdminOrdersPage() {
  const t = useTranslations('admin_orders'); 
  const locale = useLocale();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // States cho Bộ lọc & Tìm kiếm
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(total / TAKE));

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale],
  );

  // 1. Logic Debounce Tìm kiếm
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query !== searchInput) {
        setQuery(searchInput);
        setPage(1); 
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchInput, query]);

  // 2. Load Dữ liệu
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await getAdminOrders({
          q: query || undefined,
          status: statusFilter || undefined,
          dateRange: dateFilter || undefined, // Truyền xuống BE: 'today', '7days', 'month', 'year'
          skip: (page - 1) * TAKE,
          take: TAKE
        });
        setOrders(res.items || []);
        setTotal(res.total || 0);
      } catch (error) {
        console.error('Lỗi khi tải danh sách đơn hàng:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query, statusFilter, dateFilter]);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setPage(1);
  };

  // Hàm render màu Badge Trạng thái
  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      SHIPPING: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-emerald-100 text-emerald-700',
      CANCELLED: 'bg-red-100 text-red-700'
    };
    return statusStyles[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6 w-full max-w-7xl mx-auto">
      {/* Tiêu đề trang */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('list_title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('list_subtitle')}</p>
        </div>
        <div className="text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
          {t('total_count')} <span className="text-[#4592b6] font-bold">{total}</span>
        </div>
      </div>

      {/* Toolbar Lọc & Tìm kiếm */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center">
        {/* Tìm kiếm */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchInput} 
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4592b6] focus:border-[#4592b6] outline-none text-sm transition"
          />
        </div>

        {/* Lọc Trạng thái */}
        <div className="w-44">
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-[#4592b6] outline-none cursor-pointer"
          >
            <option value="">{t('filter_status_all')}</option>
            <option value="PENDING">{t('status.PENDING')}</option>
            <option value="PROCESSING">{t('status.PROCESSING')}</option>
            <option value="SHIPPING">{t('status.SHIPPING')}</option>
            <option value="DELIVERED">{t('status.DELIVERED')}</option>
            <option value="CANCELLED">{t('status.CANCELLED')}</option>
          </select>
        </div>

        {/* Lọc Ngày tháng */}
        <div className="w-40">
          <select
            value={dateFilter}
            onChange={(e) => handleFilterChange(setDateFilter, e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-[#4592b6] outline-none cursor-pointer"
          >
            <option value="">{t('filter_date_all')}</option>
            <option value="today">{t('filter_date_today')}</option>
            <option value="7days">{t('filter_date_7days')}</option>
            <option value="month">{t('filter_date_month')}</option>
            <option value="year">{t('filter_date_year')}</option>
          </select>
        </div>
      </div>

      {/* Bảng Dữ liệu */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-4 text-gray-700 font-semibold">{t('table.order_code')}</th>
                <th className="px-5 py-4 text-gray-700 font-semibold">{t('table.customer')}</th>
                <th className="px-5 py-4 text-gray-700 font-semibold">{t('table.order_date')}</th>
                <th className="px-5 py-4 text-gray-700 font-semibold">{t('table.total')}</th>
                <th className="px-5 py-4 text-gray-700 font-semibold">{t('table.status')}</th>
                <th className="px-5 py-4 text-gray-700 font-semibold text-right">{t('table.action')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                    {t('loading_list')}
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                    {t('empty_list')}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-5 py-4">
                      <span className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-md text-xs tracking-wider">
                        #{order.code}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-800">{order.address?.recipientName || 'Khách vãng lai'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{order.address?.phone || '--'}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {dateFormatter.format(new Date(order.createdAt))}
                    </td>
                    <td className="px-5 py-4 font-bold text-amber-700">
                      {currencyFormatter.format(Number(order.totalAmount || 0))}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block ${getStatusBadge(order.status)}`}>
                        {t(`status.${order.status}`)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link 
                        href={`/admin/orders/${order.id}`}
                        className="inline-block px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition"
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

      {/* Phân trang (Pagination) */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-end items-center gap-2 mt-8 pb-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm"
          >
            {t('pagination.prev')}
          </button>
          <div className="font-semibold text-gray-800 px-3 text-sm">
            {page} / {totalPages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm"
          >
            {t('pagination.next')}
          </button>
        </div>
      )}
    </div>
  );
}