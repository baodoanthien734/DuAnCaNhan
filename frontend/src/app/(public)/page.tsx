'use client';

import Link from 'next/link';

export default function Home() {
  const products = [
    { id: 1, title: 'Bình hoa gốm', description: 'Bình cắm hoa thủ công với họa tiết vân đất ấm áp.', price: '220.000 VNĐ', icon: '🌿' },
    { id: 2, title: 'Túi vải thêu tay', description: 'Túi canvas nhẹ với họa tiết hoa tinh tế.', price: '180.000 VNĐ', icon: '👜' },
    { id: 3, title: 'Nến thơm handmade', description: 'Nến lavender thơm dịu, đúc thủ công hoàn toàn.', price: '130.000 VNĐ', icon: '🕯️' },
    { id: 4, title: 'Thiệp chúc mừng', description: 'Thiệp giấy tay cùng nét chữ viết tay duyên dáng.', price: '95.000 VNĐ', icon: '✉️' },
  ];

  const categories = ['Tất cả', 'Trang trí', 'Quà tặng', 'Trang sức', 'Đồ gia dụng', 'Thiệp & Túi'];

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#f7f5f2', color: '#111827' }}>
      <header style={{ backgroundColor: '#fff', padding: '22px 20px', boxShadow: '0 10px 35px rgba(15, 23, 42, 0.05)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: '30px', margin: 0 }}>🍃 Handmade Studio</h1>
            <p style={{ margin: '6px 0 0', color: '#6b7280' }}>Đồ thủ công nhỏ xinh cho góc sống và quà tặng.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/login" style={{ color: '#111827', textDecoration: 'none', padding: '10px 18px' }}>
              Đăng nhập
            </Link>
            <Link href="/register" style={{ backgroundColor: '#111827', color: '#fff', padding: '10px 18px', borderRadius: '999px', textDecoration: 'none' }}>
              Đăng ký
            </Link>
          </div>
        </div>
      </header>

      <section style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)', padding: '70px 20px 50px', textAlign: 'center' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{ margin: 0, color: '#d97706', fontWeight: '700', letterSpacing: '0.12em' }}>SHOP THỦ CÔNG</p>
          <h2 style={{ margin: '18px 0 16px', fontSize: '44px', lineHeight: '1.05', color: '#111827' }}>Mỗi sản phẩm là một câu chuyện nhỏ.</h2>
          <p style={{ margin: '0 auto 28px', maxWidth: '640px', color: '#4b5563', fontSize: '17px', lineHeight: '1.8' }}>
            Khám phá bộ sưu tập đồ handmade độc đáo, làm bằng tay từng chi tiết và dành riêng cho những khoảnh khắc ấm áp.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button style={{ backgroundColor: '#111827', color: '#fff', border: 'none', padding: '14px 30px', borderRadius: '999px', cursor: 'pointer', fontWeight: '700' }}>
              🛍️ Mua ngay
            </button>
            <button style={{ backgroundColor: 'transparent', color: '#111827', border: '2px solid #111827', padding: '14px 30px', borderRadius: '999px', cursor: 'pointer', fontWeight: '700' }}>
              🎁 Tạo đơn hàng tùy chọn
            </button>
          </div>
        </div>
      </section>

      <section style={{ padding: '36px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '26px', color: '#111827' }}>Danh mục nổi bật</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                style={{
                  padding: '12px 18px',
                  backgroundColor: cat === 'Tất cả' ? '#f59e0b' : '#ffffff',
                  color: cat === 'Tất cả' ? '#ffffff' : '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '0 20px 40px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h3 style={{ margin: '0 0 28px', fontSize: '26px', color: '#111827' }}>Sản phẩm thủ công</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '22px'
          }}>
            {products.map((item) => (
              <div key={item.id} style={{ backgroundColor: '#ffffff', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)', cursor: 'pointer', transition: 'transform 0.25s' }}>
                <div style={{ height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7', fontSize: '56px' }}>
                  {item.icon}
                </div>
                <div style={{ padding: '24px' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '20px', color: '#111827' }}>{item.title}</h4>
                  <p style={{ margin: '0 0 16px', color: '#4b5563', lineHeight: '1.75' }}>{item.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#b45309' }}>{item.price}</span>
                    <button style={{ padding: '10px 18px', backgroundColor: '#111827', color: '#fff', border: 'none', borderRadius: '999px', cursor: 'pointer', fontSize: '14px' }}>
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ backgroundColor: '#111827', color: '#f8fafc', padding: '50px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, color: '#f59e0b', fontWeight: '700', letterSpacing: '0.15em' }}>CÂU CHUYỆN SHOP</p>
            <h3 style={{ margin: '18px 0 18px', fontSize: '32px', lineHeight: '1.1' }}>Tâm huyết handmade dành cho không gian của bạn.</h3>
            <p style={{ margin: 0, color: '#d1d5db', fontSize: '16px', lineHeight: '1.8' }}>
              Mỗi món đồ được làm bằng tay, tỉ mỉ lựa chọn chất liệu và hoàn thiện cẩn thận. Shop nhỏ nhưng chứa đựng nhiều yêu thương.
            </p>
          </div>
          <div style={{ display: 'grid', gap: '16px' }}>
            {['Thiết kế độc đáo', 'Chất liệu tự nhiên', 'Sản xuất theo yêu cầu', 'Đóng gói quà tặng'].map((item) => (
              <div key={item} style={{ backgroundColor: '#1f2937', borderRadius: '20px', padding: '20px', border: '1px solid #374151' }}>
                <p style={{ margin: 0, color: '#f8fafc', fontWeight: '600' }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ backgroundColor: '#f3f4f6', color: '#6b7280', padding: '26px 20px', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>© 2026 Handmade Studio. Đồ thủ công nhỏ, tinh tế và chân thành.</p>
      </footer>
    </div>
  );
}
