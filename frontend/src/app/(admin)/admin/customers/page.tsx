'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { getAdminCustomers, toggleCustomerStatus } from '@/lib/admin-customers-api';
import { useModal } from '@/hooks/useModal';

type AdminCustomerRow = {
  id: number;
  name: string | null;
  email: string;
  isActive: boolean;
  createdAt: string;
  totalSpent: number;
  orderCount: number;
};

const TAKE = 12;

export default function AdminCustomersPage() {
  const t = useTranslations('admin_customers');
  const modal = useModal();
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [customers, setCustomers] = useState<AdminCustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
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
      }),
    [locale],
  );

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query !== searchInput) {
        setQuery(searchInput);
        setPage(1); 
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchInput, query]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await getAdminCustomers({
        q: query || undefined,
        skip: (page - 1) * TAKE,
        take: TAKE,
      });
      setCustomers(res.items || []);
      setTotal(res.total || 0);
    } catch (error) {
      console.error('Failed to load customers', error);
      await modal.alert(t('err_load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, query]);

  const handleToggleStatus = async (customer: AdminCustomerRow) => {
    const confirmed = customer.isActive
      ? await modal.confirm(t('confirm_lock', { name: customer.name || customer.email }), 'Xác nhận')
      : true;

    if (!confirmed) return;

    setSubmittingId(customer.id);
    try {
      const res = await toggleCustomerStatus(customer.id);
      const nextStatus = res?.data?.isActive;

      setCustomers((prev) =>
        prev.map((item) =>
          item.id === customer.id
            ? {
                ...item,
                isActive: typeof nextStatus === 'boolean' ? nextStatus : !item.isActive,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error('Failed to toggle status', error);
      await modal.alert(t('err_toggle'));
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('list_title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('list_subtitle')}</p>
        </div>
      </div>

      {/* Toolbar (Đã bỏ nút Search, dùng Auto-search) */}
      <div className="flex gap-3 items-center mb-6">
        <input
          placeholder={t('search_placeholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-gray-300 w-full md:w-80 outline-none focus:ring-2 focus:ring-[#4592b6] text-sm transition"
        />
      </div>

      {/* Table Dữ liệu */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-5 py-4 text-gray-700 font-semibold">{t('table.customer')}</th>
                <th className="px-5 py-4 text-gray-700 font-semibold">{t('table.joined_at')}</th>
                <th className="px-5 py-4 text-gray-700 font-semibold">{t('table.total_spent')}</th>
                <th className="px-5 py-4 text-gray-700 font-semibold">{t('table.order_count')}</th>
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
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                    {t('empty_list')}
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const displayName = customer.name || customer.email;
                  const initial = displayName.charAt(0).toUpperCase();

                  return (
                    <tr key={customer.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar tự động tạo từ chữ cái đầu */}
                          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center border border-blue-100">
                            {initial}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{displayName}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{dateFormatter.format(new Date(customer.createdAt))}</td>
                      <td className="px-5 py-4 font-bold text-amber-700">{currencyFormatter.format(customer.totalSpent || 0)}</td>
                      <td className="px-5 py-4 text-gray-600 font-medium">{customer.orderCount}</td>
                      <td className="px-5 py-4">
                        {/* Đồng bộ màu nhãn Active/Inactive với CategoryList */}
                        {customer.isActive ? (
                          <span className="px-2.5 py-1 bg-[#dcfce3] text-[#166534] rounded-full text-xs font-semibold">
                            {t('status.active')}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-[#f3f4f6] text-[#4b5563] rounded-full text-xs font-semibold">
                            {t('status.locked')}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-3">
                          {/* Chỉnh lại nút View Detail dạng text đơn giản */}
                          <Link
                            href={`/admin/customers/${customer.id}`}
                            className="text-blue-600 font-medium hover:text-blue-800 transition text-sm"
                          >
                            {t('actions.view_detail')}
                          </Link>
                          <button
                            type="button"
                            disabled={submittingId === customer.id}
                            onClick={() => handleToggleStatus(customer)}
                            className={`text-sm font-medium transition disabled:opacity-50 ${
                              customer.isActive ? 'text-red-600 hover:text-red-800' : 'text-emerald-600 hover:text-emerald-800'
                            }`}
                          >
                            {submittingId === customer.id ? '...' : customer.isActive ? t('actions.lock') : t('actions.unlock')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phân trang (Pagination) - Đã dời sang góc phải giống CategoryList */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-end items-center gap-2 mt-6 pb-6">
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