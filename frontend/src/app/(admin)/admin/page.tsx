import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server'; 
import { getServerDashboardStats } from '@/lib/dashboard-api'; 
import RevenueChart from '@/components/ui/RevenueChart';
import OrderChart from '@/components/ui/OrderChart';

async function getProfile(token: string) {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function formatCompactNumber(number: number) {
  return Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(number);
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

const getStatusColor = (status: string, t: any) => {
  switch (status) {
    case 'PENDING': return { bg: '#fef3c7', text: '#d97706', label: t('status.pending') };
    case 'PROCESSING': return { bg: '#e0e7ff', text: '#4338ca', label: t('status.processing') };
    case 'SHIPPING': return { bg: '#dbeafe', text: '#1d4ed8', label: t('status.shipping') };
    case 'DELIVERED': return { bg: '#dcfce3', text: '#15803d', label: t('status.delivered') };
    case 'CANCELLED': return { bg: '#fee2e2', text: '#b91c1c', label: t('status.cancelled') };
    default: return { bg: '#f3f4f6', text: '#374151', label: t('status.unknown') };
  }
};

const getPaymentColor = (paymentStatus: string, t: any) => {
  switch (paymentStatus) {
    case 'PAID': return { bg: '#dcfce3', text: '#15803d', label: t('payment.paid') };
    case 'UNPAID': return { bg: '#fee2e2', text: '#b91c1c', label: t('payment.unpaid') };
    case 'REFUNDED': return { bg: '#f3f4f6', text: '#4b5563', label: t('payment.refunded') };
    default: return { bg: '#f3f4f6', text: '#374151', label: paymentStatus || t('status.unknown') };
  }
};

// Đọc tham số URL (searchParams) để biết đang chọn Tab 7 hay 28 ngày
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ rev?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) redirect('/');

  const user = await getProfile(token);
  if (!user || !Array.isArray(user.roles) || !user.roles.includes('ADMIN')) redirect('/');

  const t = await getTranslations('admin_dashboard');
  const statsData = await getServerDashboardStats(token);

  // Nhận URL Params
  const sp = await searchParams;
  const revRange = sp?.rev === '28' ? '28' : '7';

  const summary = statsData?.summary || { orders: 0, revenue: 0, products: 0, customers: 0 };
  const recentOrders = statsData?.recentOrders || [];
  const lowStock = statsData?.lowStock || [];
  
  // Trích xuất các bộ biểu đồ mới từ Backend
  const chartData7 = statsData?.chartData7 || statsData?.chartData || [];
  const chartData28 = statsData?.chartData28 || [];
  const orderChart28 = statsData?.orderChart28 || [];

  return (
    <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#111827' }}>
            {t('greeting', { name: user.name || 'Admin' })}
          </h1>
          <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '14px' }}>{t('subtitle')}</p>
        </div>
      </div>

      {/* 4 THẺ THỐNG KÊ */}
      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {[
          { label: t('stats.orders'), value: summary.orders.toLocaleString(), icon: '🛒' },
          { label: t('stats.revenue'), value: formatCompactNumber(summary.revenue), icon: '💰' },
          { label: t('stats.products'), value: summary.products.toLocaleString(), icon: '📦' },
          { label: t('stats.customers'), value: summary.customers.toLocaleString(), icon: '👥' },
        ].map((item) => (
          <div key={item.label} style={{ padding: '20px', borderRadius: '16px', backgroundColor: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '32px', backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '12px' }}>{item.icon}</div>
            <div>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>{item.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 700, color: '#111827' }}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CHIA LAYOUT 2 CỘT */}
      <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
        
        {/* CỘT TRÁI (Lớn hơn) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 2, minWidth: '60%' }}>
          
          {/* BIỂU ĐỒ DOANH THU CÓ CHỌN TAB */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              {/* SỬA THÀNH i18n */}
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{t('charts.revenue_title')}</h2>
              
              <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '8px', alignItems: 'center' }}>
                <Link 
                  href="?rev=7" 
                  style={{ 
                    display: 'inline-block', // BỔ SUNG DÒNG NÀY ĐỂ TÁCH RỜI NÚT
                    padding: '6px 12px', 
                    borderRadius: '6px', 
                    fontSize: '13px', 
                    fontWeight: 600, 
                    textDecoration: 'none', 
                    transition: 'all 0.2s',
                    backgroundColor: revRange === '7' ? '#fff' : 'transparent', 
                    color: revRange === '7' ? '#111827' : '#6b7280', 
                    boxShadow: revRange === '7' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' 
                  }}
                >
                  {t('charts.7_days')}
                </Link>
                <Link 
                  href="?rev=28" 
                  style={{ 
                    display: 'inline-block', // BỔ SUNG DÒNG NÀY ĐỂ TÁCH RỜI NÚT
                    padding: '6px 12px', 
                    borderRadius: '6px', 
                    fontSize: '13px', 
                    fontWeight: 600, 
                    textDecoration: 'none', 
                    transition: 'all 0.2s',
                    backgroundColor: revRange === '28' ? '#fff' : 'transparent', 
                    color: revRange === '28' ? '#111827' : '#6b7280', 
                    boxShadow: revRange === '28' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' 
                  }}
                >
                  {t('charts.28_days')}
                </Link>
              </div>
            </div>
            
            <RevenueChart data={revRange === '7' ? chartData7 : chartData28} />
          </div>

          {/* BIỂU ĐỒ ĐƠN HÀNG 28 NGÀY */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            {/* SỬA THÀNH i18n */}
            <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600 }}>{t('charts.order_growth_28_days')}</h2>
            <OrderChart data={orderChart28} />
          </div>

          {/* BẢNG ĐƠN HÀNG */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{t('sections.recent_orders')}</h2>
              <Link href="/admin/orders" style={{ fontSize: '13px', color: '#0284c7', textDecoration: 'none', fontWeight: 500 }}>{t('actions.view_all')}</Link>
            </div>
            
            {recentOrders.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px 0' }}>{t('sections.no_orders')}</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                      <th style={{ padding: '12px 8px', fontWeight: 500 }}>{t('table.order_id')}</th>
                      <th style={{ padding: '12px 8px', fontWeight: 500 }}>{t('table.customer')}</th>
                      <th style={{ padding: '12px 8px', fontWeight: 500 }}>{t('table.total')}</th>
                      <th style={{ padding: '12px 8px', fontWeight: 500 }}>{t('table.payment')}</th>
                      <th style={{ padding: '12px 8px', fontWeight: 500 }}>{t('table.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order: any) => {
                      const st = getStatusColor(order.status, t);
                      const paySt = getPaymentColor(order.paymentStatus, t);
                      return (
                        <tr key={order.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 600, color: '#111827' }}>#{order.id}</td>
                          <td style={{ padding: '12px 8px' }}>{order.customerName}</td>
                          <td style={{ padding: '12px 8px', fontWeight: 500 }}>{formatMoney(order.total)}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{ backgroundColor: paySt.bg, color: paySt.text, padding: '4px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 600 }}>
                              {paySt.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{ backgroundColor: st.bg, color: st.text, padding: '4px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 600 }}>
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
          
          {/* QUICK LINKS */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>{t('quick_links')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: t('links.categories'), href: '/admin/categories', icon: '📁' },
                { label: t('links.products'), href: '/admin/products', icon: '📦' },
                { label: t('links.orders'), href: '/admin/orders', icon: '🛒' },
              ].map((item) => (
                <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', backgroundColor: '#f9fafb', textDecoration: 'none', color: '#374151', fontWeight: 500, fontSize: '14px', border: '1px solid #e5e7eb', transition: 'background 0.2s' }}>
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <span style={{ color: '#9ca3af' }}>→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* CẢNH BÁO HẾT HÀNG KÈM THANH TRƯỢT */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #fecaca', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> {t('sections.low_stock')}
            </h2>
            {lowStock.length === 0 ? (
              <p style={{ margin: 0, fontSize: '14px', color: '#15803d' }}>{t('sections.stock_stable')}</p>
            ) : (
              <ul style={{ padding: '0 4px 0 0', margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
                {lowStock.map((item: any, idx: number) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingBottom: '8px', borderBottom: '1px dashed #fecaca' }}>
                    <span style={{ color: '#374151', fontWeight: 500 }}>{item.name}</span> 
                    {/* SỬA THÀNH i18n (Truyền biến stock vào) */}
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>
                      {t('sections.stock_remaining', { stock: item.stock })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}