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
      ? await modal.confirm(t('confirm_lock', { name: customer.name || customer.email }), 'Xác nhận')
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
      <div className="w-full max-w-7xl mx-auto p-6 text-sm text-gray-500">
        {t('detail.loading')}
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6">
        <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition">
          <span>←</span> {t('detail.back')}
        </Link>
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {t('detail.not_found')}
        </div>
      </div>
    );
  }

  const displayName = customer.name || customer.email;

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      
      {/* Header & Back Link */}
      <div className="flex items-center justify-between">
        <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition">
          <span></span> {t('detail.back')}
        </Link>
      </div>

      {/* Profile Card */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 text-2xl font-bold flex items-center justify-center shadow-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{customer.email}</p>
              <div className="mt-2">
                {customer.isActive ? (
                  <span className="px-2.5 py-1 bg-[#dcfce3] text-[#166534] rounded-full text-xs font-semibold inline-block">
                    {t('status.active')}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-[#f3f4f6] text-[#4b5563] rounded-full text-xs font-semibold inline-block">
                    {t('status.locked')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleToggleStatus}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60 border ${
              customer.isActive 
                ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' 
                : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
            }`}
          >
            {customer.isActive ? t('actions.lock') : t('actions.unlock')}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-center">
          <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">{t('detail.total_spent')}</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{currencyFormatter.format(totalSpent)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-center">
          <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">{t('detail.order_count')}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{orderCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-center">
          <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">{t('detail.review_count')}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{reviewCount}</p>
        </div>
      </div>

      {/* Overview Info */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-4">{t('detail.overview')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <p className="text-gray-500 mb-1">{t('detail.email')}</p>
            <p className="font-medium text-gray-900">{customer.email}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <p className="text-gray-500 mb-1">{t('detail.joined_at')}</p>
            <p className="font-medium text-gray-900">{dateFormatter.format(new Date(customer.createdAt))}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 md:col-span-2">
            <p className="text-gray-500 mb-1">{t('detail.login_methods')}</p>
            <p className="font-medium text-gray-900">{loginMethods.join(', ') || '-'}</p>
          </div>
        </div>
      </div>

      {/* Address & Purchase History */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Address Book */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-4">{t('detail.address_book')}</h2>

          {customer.addresses.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4">{t('detail.no_addresses')}</p>
          ) : (
            <div className="space-y-4">
              {customer.addresses.map((address) => (
                <div key={address.id} className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 text-sm relative group">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-gray-900">{address.recipientName}</p>
                    {address.isDefault && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] uppercase tracking-wide font-bold text-blue-700">
                        {t('detail.default_badge')}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 font-medium">{address.phone}</p>
                  <p className="text-gray-500 mt-1 leading-relaxed">
                    {address.street}, {address.ward}, {address.district}, {address.city}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purchase History */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-4">{t('detail.purchase_history')}</h2>

          {customer.orders.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4">{t('detail.no_orders')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-gray-500 text-xs uppercase bg-gray-50/80">
                  <tr>
                    <th className="text-left px-3 py-3 font-semibold rounded-l-lg">{t('detail.order_code')}</th>
                    <th className="text-left px-3 py-3 font-semibold">{t('detail.order_date')}</th>
                    <th className="text-left px-3 py-3 font-semibold">{t('detail.order_total')}</th>
                    <th className="text-left px-3 py-3 font-semibold rounded-r-lg">{t('detail.order_status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.slice(0, 8).map((order) => (
                    <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
                      <td className="px-3 py-3.5 font-semibold text-gray-800">#{order.code}</td>
                      <td className="px-3 py-3.5 text-gray-500">{dateFormatter.format(new Date(order.createdAt))}</td>
                      <td className="px-3 py-3.5 text-amber-700 font-bold">
                        {currencyFormatter.format(Number(order.totalAmount || 0))}
                      </td>
                      <td className="px-3 py-3.5 text-gray-700 font-medium">{t(`order_status.${order.status}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-5">{t('detail.recent_activity')}</h2>

        {timeline.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-2">{t('detail.no_activity')}</p>
        ) : (
          <div className="space-y-6">
            {timeline.map((item, index) => (
              <div key={item.id} className="flex gap-4 relative">
                {/* Dây dọc nối timeline */}
                {index !== timeline.length - 1 && (
                  <div className="absolute left-1.5 top-6 bottom-[-24px] w-px bg-gray-200" />
                )}
                
                <div className="mt-1.5 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-blue-50 z-10 flex-shrink-0" />
                
                <div className="flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-bold text-gray-800">{item.title}</p>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider ${
                        item.type === 'review' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.type === 'review' ? t('detail.timeline.review_badge') : t('detail.timeline.log_badge')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed break-words bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                    {item.description}
                  </p>
                  <p className="mt-2 text-xs font-medium text-gray-400">
                    {dateTimeFormatter.format(new Date(item.createdAt))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}