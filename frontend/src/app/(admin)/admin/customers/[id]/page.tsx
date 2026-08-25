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
  city: string;
  isDefault: boolean;
  isDeleted: boolean;
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

// Hàm hỗ trợ: Chuẩn hóa chuỗi tiếng Việt (xóa dấu, chuyển chữ thường)
const normalizeString = (str: string) => {
  if (!str) return '';
  return str
    .normalize('NFD') // Tách dấu ra khỏi ký tự
    .replace(/[\u0300-\u036f]/g, '') // Xóa các dấu
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
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

  // --- STATES BỘ LỌC ĐƠN HÀNG ---
  const [orderStatus, setOrderStatus] = useState<string>('ALL');
  const [orderSort, setOrderSort] = useState<string>('NEWEST');
  const [orderTime, setOrderTime] = useState<string>('ALL');

  // --- STATES BỘ LỌC ĐÁNH GIÁ ---
  const [reviewRating, setReviewRating] = useState<string>('ALL');
  const [reviewHasComment, setReviewHasComment] = useState<boolean>(false);
  const [reviewSearch, setReviewSearch] = useState<string>('');

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

  const loginMethods = useMemo(() => {
    if (!customer) return [] as string[];
    const methods = new Set<string>();
    if (customer.accounts.length === 0) methods.add(t('detail.login_method_password'));
    for (const account of customer.accounts) {
      if (account.provider.toLowerCase() === 'google') methods.add(t('detail.login_method_google'));
      else methods.add(account.provider);
    }
    return Array.from(methods);
  }, [customer, t]);

  // --- LOGIC LỌC ĐƠN HÀNG ---
  const filteredOrders = useMemo(() => {
    if (!customer) return [];
    let result = [...customer.orders];
    const now = new Date();

    if (orderStatus !== 'ALL') {
      result = result.filter(o => o.status === orderStatus);
    }

    if (orderTime !== 'ALL') {
      const orderDateThreshold = new Date();
      if (orderTime === '7D') {
        orderDateThreshold.setDate(now.getDate() - 7);
      } else if (orderTime === '30D') {
        orderDateThreshold.setDate(now.getDate() - 30);
      } else if (orderTime === '6M') {
        orderDateThreshold.setMonth(now.getMonth() - 6);
      } else if (orderTime === 'YEAR') {
        orderDateThreshold.setFullYear(now.getFullYear(), 0, 1);
      }
      result = result.filter(o => new Date(o.createdAt) >= orderDateThreshold);
    }

    if (orderSort === 'AMOUNT_DESC') {
      result.sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount));
    } else if (orderSort === 'AMOUNT_ASC') {
      result.sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount));
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [customer, orderStatus, orderSort, orderTime]);

  // --- LOGIC LỌC ĐÁNH GIÁ THÔNG MINH ---
  const filteredReviews = useMemo(() => {
    if (!customer) return [];
    let result = [...customer.reviews];

    if (reviewRating !== 'ALL') {
      result = result.filter(r => r.rating === Number(reviewRating));
    }

    if (reviewHasComment) {
      result = result.filter(r => r.comment && r.comment.trim().length > 0);
    }

    if (reviewSearch.trim()) {
      const searchNormalized = normalizeString(reviewSearch);
      result = result.filter(r => {
        const productNameNormalized = normalizeString(r.product?.name || '');
        return productNameNormalized.includes(searchNormalized);
      });
    }

    return result;
  }, [customer, reviewRating, reviewHasComment, reviewSearch]);

  if (loading) return <div className="w-full max-w-7xl mx-auto p-6 text-sm text-gray-500">{t('detail.loading')}</div>;

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
      
      <div className="flex items-center justify-between">
        <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition">
          <span>←</span> {t('detail.back')}
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
              customer.isActive ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
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
          <p className="mt-2 text-2xl font-bold text-gray-900">{customer.orders.length}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-center">
          <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">{t('detail.review_count')}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{customer.reviews.length}</p>
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

      {/* Danh sách phân khu */}
      <div className="space-y-6">
        
        {/* Sổ Địa Chỉ */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-4">
            {t('detail.address_book')} ({customer.addresses.length})
          </h2>
          {customer.addresses.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2">{t('detail.no_addresses')}</p>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {customer.addresses.map((address) => (
                <div key={address.id} className={`rounded-lg border p-4 text-sm relative group ${address.isDeleted ? 'border-red-100 bg-red-50/30' : 'border-gray-100 bg-gray-50/50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className={`font-semibold ${address.isDeleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {address.recipientName} - {address.phone}
                    </p>
                    <div className="flex gap-2">
                      {address.isDefault && !address.isDeleted && (
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] uppercase tracking-wide font-bold text-blue-700">
                          {t('detail.default_badge')}
                        </span>
                      )}
                      {address.isDeleted && (
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] uppercase tracking-wide font-bold text-red-700">
                          {t('detail.deleted_badge')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`space-y-1.5 ${address.isDeleted ? 'opacity-60' : ''}`}>
                    <div className="flex gap-3">
                      <span className="text-gray-500 font-medium min-w-[100px]">{t('detail.street')}:</span>
                      <span className="text-gray-800">{address.street}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-gray-500 font-medium min-w-[100px]">{t('detail.ward')}:</span>
                      <span className="text-gray-800">{address.ward}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-gray-500 font-medium min-w-[100px]">{t('detail.city')}:</span>
                      <span className="text-gray-800">{address.city}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lịch sử đơn hàng (Kèm bộ lọc) */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-3 mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              {t('detail.purchase_history')} ({customer.orders.length})
            </h2>
            
            {customer.orders.length > 0 && (
              <div className="flex flex-wrap gap-2 text-sm">
                <select 
                  value={orderStatus} 
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{t('detail.filter_status')}: {t('detail.filter_all')}</option>
                  <option value="PENDING">{t('order_status.PENDING')}</option>
                  <option value="PROCESSING">{t('order_status.PROCESSING')}</option>
                  <option value="SHIPPING">{t('order_status.SHIPPING')}</option>
                  <option value="DELIVERED">{t('order_status.DELIVERED')}</option>
                  <option value="CANCELLED">{t('order_status.CANCELLED')}</option>
                </select>

                <select 
                  value={orderTime} 
                  onChange={(e) => setOrderTime(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{t('detail.filter_time_all')}</option>
                  <option value="7D">{t('detail.filter_time_7d') || '7 ngày qua'}</option>
                  <option value="30D">{t('detail.filter_time_30d')}</option>
                  <option value="6M">{t('detail.filter_time_6m')}</option>
                  <option value="YEAR">{t('detail.filter_time_year')}</option>
                </select>

                <select 
                  value={orderSort} 
                  onChange={(e) => setOrderSort(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NEWEST">{t('detail.sort_default')}</option>
                  <option value="AMOUNT_DESC">{t('detail.sort_amount_desc')}</option>
                  <option value="AMOUNT_ASC">{t('detail.sort_amount_asc')}</option>
                </select>
              </div>
            )}
          </div>

          {customer.orders.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2">{t('detail.no_orders')}</p>
          ) : filteredOrders.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4 text-center bg-gray-50 rounded-lg border border-dashed">{t('detail.no_results')}</p>
          ) : (
            <div className="max-h-[400px] overflow-auto border border-gray-100 rounded-lg">
              <table className="min-w-full text-sm relative">
                <thead className="text-gray-500 text-xs uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">{t('detail.order_code')}</th>
                    <th className="text-left px-4 py-3 font-semibold">{t('detail.order_date')}</th>
                    <th className="text-left px-4 py-3 font-semibold">{t('detail.order_total')}</th>
                    <th className="text-left px-4 py-3 font-semibold">{t('detail.order_status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3.5 font-semibold text-gray-800">#{order.code}</td>
                      <td className="px-4 py-3.5 text-gray-500">{dateFormatter.format(new Date(order.createdAt))}</td>
                      <td className="px-4 py-3.5 text-amber-700 font-bold">{currencyFormatter.format(Number(order.totalAmount || 0))}</td>
                      <td className="px-4 py-3.5 text-gray-700 font-medium">{t(`order_status.${order.status}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Đánh giá sản phẩm (Kèm bộ lọc thông minh) */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-3 mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              {t('detail.tab_reviews')} ({customer.reviews.length})
            </h2>
            
            {customer.reviews.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <input 
                  type="text"
                  placeholder={t('detail.search_product')}
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-48"
                />
                
                <select 
                  value={reviewRating} 
                  onChange={(e) => setReviewRating(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{t('detail.filter_rating')}: {t('detail.filter_all')}</option>
                  <option value="5">5 Sao</option>
                  <option value="4">4 Sao</option>
                  <option value="3">3 Sao</option>
                  <option value="2">2 Sao</option>
                  <option value="1">1 Sao</option>
                </select>

                <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 font-medium">
                  <input 
                    type="checkbox" 
                    checked={reviewHasComment} 
                    onChange={(e) => setReviewHasComment(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {t('detail.filter_has_comment')}
                </label>
              </div>
            )}
          </div>

          {customer.reviews.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2">{t('detail.no_reviews')}</p>
          ) : filteredReviews.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4 text-center bg-gray-50 rounded-lg border border-dashed">{t('detail.no_results')}</p>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {filteredReviews.map((review) => (
                <div key={review.id} className="bg-gray-50/50 p-4 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-gray-800 text-sm">{review.product?.name || 'Sản phẩm đã bị xóa'}</div>
                    <div className="text-xs text-gray-400">{dateTimeFormatter.format(new Date(review.createdAt))}</div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 mb-2 text-xs">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">{review.comment || <span className="italic text-gray-400">Không có bình luận.</span>}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nhật ký hệ thống (System Logs) */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-4">
            {t('detail.tab_logs')} ({customer.logs.length})
          </h2>
          {customer.logs.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2">{t('detail.no_logs')}</p>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {customer.logs.map((log) => (
                <div key={log.id} className="bg-gray-50/50 p-4 rounded-lg border border-gray-100 flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="w-full md:w-1/3">
                    <span className="px-2 py-1 bg-gray-200 text-gray-700 text-[10px] font-bold uppercase rounded">{log.action}</span>
                    <div className="text-xs text-gray-400 mt-2">{dateTimeFormatter.format(new Date(log.createdAt))}</div>
                  </div>
                  <div className="flex-1 text-sm text-gray-600 font-mono break-all bg-white border border-gray-200 p-2 rounded max-h-24 overflow-y-auto">
                    {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}