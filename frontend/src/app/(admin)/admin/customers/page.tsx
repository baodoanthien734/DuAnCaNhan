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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query]);

  const handleSearch = () => {
    setPage(1);
    setQuery(searchInput.trim());
  };

  const handleToggleStatus = async (customer: AdminCustomerRow) => {
    const confirmed = customer.isActive
      ? await modal.confirm(t('confirm_lock', { name: customer.name || customer.email }))
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
    <div className="w-full max-w-7xl mx-auto p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{t('list_title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('list_subtitle')}</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            placeholder={t('search_placeholder')}
            className="w-full md:w-80 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {t('search_button')}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">{t('table.customer')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('table.joined_at')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('table.total_spent')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('table.order_count')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('table.status')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('table.action')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    {t('loading_list')}
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    {t('empty_list')}
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const displayName = customer.name || customer.email;
                  const initial = displayName.charAt(0).toUpperCase();

                  return (
                    <tr key={customer.id} className="border-t border-slate-100">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center">
                            {initial}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{displayName}</p>
                            <p className="text-slate-500 text-xs">{customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{dateFormatter.format(new Date(customer.createdAt))}</td>
                      <td className="px-4 py-4 font-medium text-amber-700">{currencyFormatter.format(customer.totalSpent || 0)}</td>
                      <td className="px-4 py-4 text-slate-700">{customer.orderCount}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            customer.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {customer.isActive ? t('status.active') : t('status.locked')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/customers/${customer.id}`}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {t('actions.view_detail')}
                          </Link>
                          <button
                            type="button"
                            disabled={submittingId === customer.id}
                            onClick={() => handleToggleStatus(customer)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${
                              customer.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {customer.isActive ? t('actions.lock') : t('actions.unlock')}
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

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500">{t('pagination.total', { total })}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              {t('pagination.prev')}
            </button>
            <span className="text-xs font-medium text-slate-600">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              {t('pagination.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
