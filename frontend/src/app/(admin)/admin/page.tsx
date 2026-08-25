import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server'; 
import { getServerDashboardStats } from '@/lib/dashboard-api'; 
import RevenueChart from '@/components/ui/RevenueChart';

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

// Hàm map màu cho trạng thái đơn
const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING': return { bg: '#fef3c7', text: '#d97706', label: 'Chờ xử lý' };
    case 'PROCESSING': return { bg: '#e0e7ff', text: '#4338ca', label: 'Đang chuẩn bị' };
    case 'SHIPPING': return { bg: '#dbeafe', text: '#1d4ed8', label: 'Đang giao' };
    case 'DELIVERED': return { bg: '#dcfce3', text: '#15803d', label: 'Hoàn thành' };
    case 'CANCELLED': return { bg: '#fee2e2', text: '#b91c1c', label: 'Đã hủy' };
    default: return { bg: '#f3f4f6', text: '#374151', label: status };
  }
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) redirect('/');

  const user = await getProfile(token);
  if (!user || !Array.isArray(user.roles) || !user.roles.includes('ADMIN')) redirect('/');

  const t = await getTranslations('admin_dashboard');
  const statsData = await getServerDashboardStats(token);

  // Lấy dữ liệu an toàn từ API mới
  const summary = statsData?.summary || { orders: 0, revenue: 0, products: 0, customers: 0 };
  const recentOrders = statsData?.recentOrders || [];
  const lowStock = statsData?.lowStock || [];
  const chartData = statsData?.chartData || [];

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
          
          {/* BIỂU ĐỒ */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600 }}>{t('charts.revenue_7_days')}</h2>
            <RevenueChart data={chartData} />
          </div>

          {/* BẢNG ĐƠN HÀNG */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{t('sections.recent_orders')}</h2>
              <Link href="/admin/orders" style={{ fontSize: '13px', color: '#0284c7', textDecoration: 'none', fontWeight: 500 }}>{t('actions.view_all')}</Link>
            </div>
            
            {recentOrders.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px 0' }}>Chưa có đơn hàng nào.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                      <th style={{ padding: '12px 8px', fontWeight: 500 }}>Mã ĐH</th>
                      <th style={{ padding: '12px 8px', fontWeight: 500 }}>Khách hàng</th>
                      <th style={{ padding: '12px 8px', fontWeight: 500 }}>Tổng tiền</th>
                      <th style={{ padding: '12px 8px', fontWeight: 500 }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order: any) => {
                      const st = getStatusColor(order.status);
                      return (
                        <tr key={order.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 600, color: '#111827' }}>#{order.id}</td>
                          <td style={{ padding: '12px 8px' }}>{order.customerName}</td>
                          <td style={{ padding: '12px 8px', fontWeight: 500 }}>{formatMoney(order.total)}</td>
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

          {/* CẢNH BÁO HẾT HÀNG */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #fecaca', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> {t('sections.low_stock')}
            </h2>
            {lowStock.length === 0 ? (
              <p style={{ margin: 0, fontSize: '14px', color: '#15803d' }}>Kho hàng đang ổn định.</p>
            ) : (
              <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {lowStock.map((item: any, idx: number) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingBottom: '8px', borderBottom: '1px dashed #fecaca' }}>
                    <span style={{ color: '#374151', fontWeight: 500 }}>{item.name}</span> 
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>Còn {item.stock}</span>
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