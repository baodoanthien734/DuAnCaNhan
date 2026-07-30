import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) redirect('/login');

  const user = await getProfile(token);
  if (!user) redirect('/login');

  const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
  if (!roles.includes('ADMIN')) {
    redirect('/home');
  }

  return (
    <div style={{ display: 'grid', gap: '28px' }}>
      <section style={{ display: 'grid', gap: '18px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '28px',
            borderRadius: '32px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: '1 1 400px' }}>
              <p style={{ margin: 0, color: '#0c4a6e', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', fontWeight: 700 }}>
                Bảng điều khiển
              </p>
              <h1 style={{ margin: '12px 0 0', fontSize: '36px', color: '#0f172a' }}>Chào mừng đến TinyHandMade</h1>
              <p style={{ margin: '16px 0 0', color: '#475569', fontSize: '16px', maxWidth: '720px' }}>
                Quản lý sản phẩm, đơn hàng, nội dung và khách hàng trong một không gian sạch sẽ, thanh lịch và dễ sử dụng.
              </p>
            </div>

            <div style={{ minWidth: '220px', padding: '22px', borderRadius: '24px', backgroundColor: '#eff6ff', border: '1px solid #bae6fd' }}>
              <p style={{ margin: 0, color: '#0c4a6e', fontSize: '14px', fontWeight: 700 }}>Tình trạng hệ thống</p>
              <p style={{ margin: '12px 0 0', color: '#334155', fontSize: '15px' }}>
                Tất cả dịch vụ đang hoạt động ổn định. Bạn có thể kiểm tra số liệu, cập nhật sản phẩm và phản hồi bình luận nhanh chóng.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {[
              { label: 'Tổng đơn hàng', value: '128' },
              { label: 'Sản phẩm', value: '52' },
              { label: 'Bài viết', value: '14' },
              { label: 'Khách hàng', value: '312' },
            ].map((item) => (
              <div key={item.label} style={{ padding: '22px', borderRadius: '24px', backgroundColor: '#f8fbff', border: '1px solid #dbeafe' }}>
                <p style={{ margin: 0, color: '#0f172a', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  {item.label}
                </p>
                <p style={{ margin: '14px 0 0', fontSize: '32px', fontWeight: 700, color: '#0c4a6e' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '28px', color: '#0f172a' }}>Phím tắt quản lý</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '15px' }}>
              Truy cập nhanh đến các khu vực chính của TinyHandMade.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {[
            { label: 'Danh mục', href: '/admin/categories' },
            { label: 'Sản phẩm', href: '/admin/products' },
            { label: 'Bài viết', href: '/admin/posts' },
            { label: 'Đơn hàng', href: '/admin/orders' },
            { label: 'Đánh giá', href: '/admin/reviews' },
            { label: 'Khách hàng', href: '/admin/customers' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 22px',
                borderRadius: '20px',
                backgroundColor: '#ffffff',
                textDecoration: 'none',
                color: '#0f172a',
                fontWeight: 700,
                boxShadow: '0 16px 35px rgba(15, 23, 42, 0.06)',
                border: '1px solid #e2e8f0',
              }}
            >
              <span>{item.label}</span>
              <span style={{ fontSize: '20px', color: '#0284c7' }}>→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
