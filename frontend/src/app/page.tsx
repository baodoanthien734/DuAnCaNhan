'use client';

import Link from 'next/link';

export default function Home() {
  const novels = [
    { id: 1, title: 'Sword Art Online', author: 'Reki Kawahara', price: '89,000 VNĐ', cover: '📚', rating: 4.8 },
    { id: 2, title: 'That Time I Got Reincarnated', author: 'Fuse', price: '79,000 VNĐ', cover: '📖', rating: 4.9 },
    { id: 3, title: 'Re:Zero', author: 'Tappei Nagatsuki', price: '85,000 VNĐ', cover: '📕', rating: 4.7 },
    { id: 4, title: 'Overlord', author: 'Kugane Maruyama', price: '82,000 VNĐ', cover: '📗', rating: 4.6 },
  ];

  const categories = ['Tất cả', 'Isekai', 'Action', 'Fantasy', 'Romance', 'Mystery'];

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#1e1e2e',
        color: '#fff',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '28px', margin: 0 }}>📚 LightNovel Hub</h1>
          <div style={{ display: 'flex', gap: '15px' }}>
            <Link href="/login" style={{ color: '#fff', textDecoration: 'none', padding: '8px 16px' }}>
              Đăng nhập
            </Link>
            <Link href="/register" style={{
              backgroundColor: '#0070f3',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '4px',
              textDecoration: 'none'
            }}>
              Đăng ký
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        padding: '60px 20px',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '40px', margin: '0 0 15px 0' }}>Khám Phá Thế Giới Light Novel</h2>
        <p style={{ fontSize: '18px', margin: '0 0 30px 0' }}>Mua, bán và trao đổi những bộ truyện yêu thích của bạn</p>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button style={{
            backgroundColor: '#fff',
            color: '#667eea',
            border: 'none',
            padding: '12px 30px',
            fontSize: '16px',
            borderRadius: '25px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}>
            🛒 Mua Sách
          </button>
          <button style={{
            backgroundColor: 'transparent',
            color: '#fff',
            border: '2px solid #fff',
            padding: '12px 30px',
            fontSize: '16px',
            borderRadius: '25px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}>
            📤 Bán Sách
          </button>
        </div>
      </section>

      {/* Search Bar */}
      <section style={{ padding: '40px 20px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <input
            type="text"
            placeholder="Tìm kiếm light novel..."
            style={{
              width: '100%',
              padding: '15px 20px',
              fontSize: '16px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </section>

      {/* Categories */}
      <section style={{ padding: '30px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h3 style={{ marginBottom: '20px' }}>Thể loại</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              style={{
                padding: '8px 16px',
                backgroundColor: cat === 'Tất cả' ? '#667eea' : '#f0f0f0',
                color: cat === 'Tất cả' ? '#fff' : '#333',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Featured Novels */}
      <section style={{ padding: '30px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h3 style={{ marginBottom: '30px' }}>📕 Sách Nổi Bật</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          {novels.map((novel) => (
            <div
              key={novel.id}
              style={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                transition: 'transform 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{
                backgroundColor: '#e0e0e0',
                height: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '80px'
              }}>
                {novel.cover}
              </div>
              <div style={{ padding: '15px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{novel.title}</h4>
                <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>Tác giả: {novel.author}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#667eea' }}>{novel.price}</span>
                  <span style={{ color: '#ff9800' }}>⭐ {novel.rating}</span>
                </div>
                <button style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#667eea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}>
                  Xem Chi Tiết
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section style={{
        backgroundColor: '#1e1e2e',
        color: '#fff',
        padding: '50px 20px',
        marginTop: '50px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', textAlign: 'center' }}>
          <div>
            <h3 style={{ fontSize: '36px', margin: '0 0 10px 0' }}>10K+</h3>
            <p style={{ margin: 0 }}>Bộ Light Novel</p>
          </div>
          <div>
            <h3 style={{ fontSize: '36px', margin: '0 0 10px 0' }}>50K+</h3>
            <p style={{ margin: 0 }}>Người Dùng Tích Cực</p>
          </div>
          <div>
            <h3 style={{ fontSize: '36px', margin: '0 0 10px 0' }}>100K+</h3>
            <p style={{ margin: 0 }}>Giao Dịch Thành Công</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#0f0f0f',
        color: '#999',
        padding: '30px 20px',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0 }}>© 2026 LightNovel Hub. Tất cả quyền được bảo lưu.</p>
      </footer>
    </div>
  );
}