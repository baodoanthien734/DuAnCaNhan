import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server'; 
import { getServerDashboardStats } from '@/lib/dashboard-api'; 

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

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) redirect('/');

  const user = await getProfile(token);
  if (!user) redirect('/');

  const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
  if (!roles.includes('ADMIN')) {
    redirect('/'); 
  }

  const t = await getTranslations('admin_dashboard');

  const statsData = await getServerDashboardStats(token);
  console.log("Dữ liệu từ API:", statsData);

  // Fallback data nếu API lỗi hoặc chưa có dữ liệu
  const stats = {
    orders: statsData?.orders || 0,
    revenue: statsData?.revenue || 0,
    products: statsData?.products || 0,
    customers: statsData?.customers || 0,
  };

  return (
    <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* SECTION 1: HEADER & STATS */}
      <section>
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Lời chào & Trạng thái */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 400px' }}>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#111827' }}>
                {t('greeting', { name: user.name || 'Admin' })}
              </h1>
              <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '14px' }}>
                {t('subtitle')}
              </p>
            </div>

            {/* Trạng thái hệ thống */}
            <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', minWidth: '240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#0369a1', borderRadius: '50%' }}></span>
                <p style={{ margin: 0, color: '#0369a1', fontSize: '14px', fontWeight: 600 }}>{t('status_title')}</p>
              </div>
              <p style={{ margin: '4px 0 0', color: '#0284c7', fontSize: '13px' }}>
                {t('status_desc')}
              </p>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: '#e5e7eb' }}></div>

          {/* 4 Thẻ Thống kê (Áp dụng dữ liệu thật từ biến `stats`) */}
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {[
              { label: t('stats.orders'), value: stats.orders.toLocaleString(), icon: '🛒' },
              { label: t('stats.revenue'), value: formatCompactNumber(stats.revenue), icon: '💰' },
              { label: t('stats.products'), value: stats.products.toLocaleString(), icon: '📦' },
              { label: t('stats.customers'), value: stats.customers.toLocaleString(), icon: '👥' },
            ].map((item) => (
              <div 
                key={item.label} 
                style={{ 
                  padding: '16px 20px', 
                  borderRadius: '12px', 
                  backgroundColor: '#f9fafb', 
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <div style={{ fontSize: '28px' }}>{item.icon}</div>
                <div>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>
                    {item.label}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2: QUICK LINKS (Giữ nguyên) */}
      <section>
        <div style={{ marginBottom: '16px', paddingLeft: '4px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>{t('quick_links')}</h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
            {t('quick_links_desc')}
          </p>
        </div>

        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {[
            { label: t('links.categories'), href: '/admin/categories', icon: '📁' },
            { label: t('links.products'), href: '/admin/products', icon: '📦' },
            { label: t('links.posts'), href: '/admin/posts', icon: '📝' },
            { label: t('links.orders'), href: '/admin/orders', icon: '🛒' },
            { label: t('links.reviews'), href: '/admin/reviews', icon: '⭐' },
            { label: t('links.customers'), href: '/admin/customers', icon: '👥' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="quick-link-card" 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                textDecoration: 'none',
                color: '#374151',
                fontWeight: 600,
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              <span style={{ color: '#9ca3af', fontWeight: 400 }}>→</span>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}