'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { getAdminCustomerById, toggleCustomerStatus } from '@/lib/admin-customers-api';
import { useModal } from '@/hooks/useModal';

type Address = {
  id: number;
  recipientName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
};

type Order = {
  id: number;
  code: string;
  totalAmount: number | string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
};

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  product?: {
    id: number;
    name: string;
    slug: string;
  } | null;
};

type AuditLog = {
  id: number;
  action: string;
  resource: string | null;
  details: any;
  createdAt: string;
};

type Account = {
  id: number;
  provider: string;
};

type CustomerDetail = {
  id: number;
  name: string | null;
  email: string;
  isActive: boolean;
  createdAt: string;
  addresses: Address[];
  orders: Order[];
  reviews: Review[];
  logs: AuditLog[];
  accounts: Account[];
};

type TimelineItem = {
  id: string;
  type: 'review' | 'log';
  createdAt: string;
  title: string;
  description: string;
};

export default function AdminCustomerDetailPage() {
  const t = useTranslations('admin_customers');
  const modal = useModal();
  const locale = useLocale();
  const params = useParams();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const dateTimeFormatter = useMemo(
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

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    [locale],
  );

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const data = await getAdminCustomerById(id);
      setCustomer(data);
    } catch (error) {
      console.error('Failed to load customer detail', error);
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setLoading(false);
      return;
    }
    fetchCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleToggleStatus = async () => {
    if (!customer) return;

    const confirmed = customer.isActive
      ? await modal.confirm(t('confirm_lock', { name: customer.name || customer.email }))
      : true;

    if (!confirmed) return;

    setSubmitting(true);
    try {
      const res = await toggleCustomerStatus(customer.id);
      const nextStatus = res?.data?.isActive;
      setCustomer((prev) =>
        prev
          ? {
              ...prev,
              isActive: typeof nextStatus === 'boolean' ? nextStatus : !prev.isActive,
            }
          : prev,
      );
    } catch (error) {
      console.error('Failed to toggle status', error);
      await modal.alert(t('err_toggle'));
    } finally {
      setSubmitting(false);
    }
  };

  const totalSpent = useMemo(() => {
    if (!customer) return 0;
    return customer.orders
      .filter((order) => order.status === 'DELIVERED')
      .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  }, [customer]);

  const reviewCount = customer?.reviews.length || 0;
  const orderCount = customer?.orders.length || 0;

  const loginMethods = useMemo(() => {
    if (!customer) return [] as string[];

    const methods = new Set<string>();
    if (customer.accounts.length === 0) {
      methods.add(t('detail.login_method_password'));
    }

    for (const account of customer.accounts) {
      if (account.provider.toLowerCase() === 'google') {
        methods.add(t('detail.login_method_google'));
      } else {
        methods.add(account.provider);
      }
    }

    return Array.from(methods);
  }, [customer, t]);

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!customer) return [];

    const reviewEvents: TimelineItem[] = customer.reviews.map((review) => ({
      id: `review-${review.id}`,
      type: 'review',
      createdAt: review.createdAt,
      title: t('detail.timeline.review_title'),
      description: t('detail.timeline.review_event', {
        product: review.product?.name || t('detail.timeline.unknown_product'),
        rating: review.rating,
      }),
    }));

    const logEvents: TimelineItem[] = customer.logs.map((log) => {
      const detailsText =
        typeof log.details === 'string'
          ? log.details
          : log.details
            ? JSON.stringify(log.details)
            : '';

      return {
        id: `log-${log.id}`,
        type: 'log',
        createdAt: log.createdAt,
        title: t('detail.timeline.log_title'),
        description: [log.action, log.resource, detailsText].filter(Boolean).join(' • '),
      };
    });

    return [...reviewEvents, ...logEvents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [customer, t]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 md:p-8 text-sm text-slate-500">
        {t('detail.loading')}
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 md:p-8">
        <Link href="/admin/customers" className="text-sm text-blue-600 hover:underline">
          {t('detail.back')}
        </Link>
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {t('detail.not_found')}
        </div>
      </div>
    );
  }

  const displayName = customer.name || customer.email;

  return (
    <div className="w-full max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/customers" className="text-sm text-blue-600 hover:underline">
          {t('detail.back')}
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-700 text-2xl font-bold flex items-center justify-center">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
              <p className="text-sm text-slate-500">{customer.email}</p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  customer.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {customer.isActive ? t('status.active') : t('status.locked')}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleToggleStatus}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
              customer.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {customer.isActive ? t('actions.lock') : t('actions.unlock')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">{t('detail.total_spent')}</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{currencyFormatter.format(totalSpent)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">{t('detail.order_count')}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{orderCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">{t('detail.review_count')}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{reviewCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">{t('detail.overview')}</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-slate-500">{t('detail.email')}</p>
            <p className="font-medium text-slate-800">{customer.email}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-slate-500">{t('detail.joined_at')}</p>
            <p className="font-medium text-slate-800">{dateFormatter.format(new Date(customer.createdAt))}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 md:col-span-2">
            <p className="text-slate-500">{t('detail.login_methods')}</p>
            <p className="font-medium text-slate-800">{loginMethods.join(', ') || '-'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">{t('detail.address_book')}</h2>

          {customer.addresses.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{t('detail.no_addresses')}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {customer.addresses.map((address) => (
                <div key={address.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{address.recipientName}</p>
                    {address.isDefault && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        {t('detail.default_badge')}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 mt-1">{address.phone}</p>
                  <p className="text-slate-600 mt-1">
                    {address.street}, {address.ward}, {address.district}, {address.city}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">{t('detail.purchase_history')}</h2>

          {customer.orders.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{t('detail.no_orders')}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="text-left py-2 font-semibold">{t('detail.order_code')}</th>
                    <th className="text-left py-2 font-semibold">{t('detail.order_date')}</th>
                    <th className="text-left py-2 font-semibold">{t('detail.order_total')}</th>
                    <th className="text-left py-2 font-semibold">{t('detail.order_status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.slice(0, 8).map((order) => (
                    <tr key={order.id} className="border-t border-slate-100">
                      <td className="py-2 font-medium text-slate-800">#{order.code}</td>
                      <td className="py-2 text-slate-600">{dateFormatter.format(new Date(order.createdAt))}</td>
                      <td className="py-2 text-amber-700 font-semibold">
                        {currencyFormatter.format(Number(order.totalAmount || 0))}
                      </td>
                      <td className="py-2 text-slate-700">{t(`order_status.${order.status}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">{t('detail.recent_activity')}</h2>

        {timeline.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{t('detail.no_activity')}</p>
        ) : (
          <div className="mt-5 space-y-4">
            {timeline.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                <div className="flex-1 border-l border-slate-200 pl-4 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-800">{item.title}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.type === 'review' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.type === 'review' ? t('detail.timeline.review_badge') : t('detail.timeline.log_badge')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 break-words">{item.description}</p>
                  <p className="mt-1 text-xs text-slate-400">{dateTimeFormatter.format(new Date(item.createdAt))}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
