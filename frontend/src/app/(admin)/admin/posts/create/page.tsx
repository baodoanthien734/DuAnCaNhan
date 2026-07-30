export default function AdminPostCreatePage() {
  return (
    <div style={{ display: 'grid', gap: '22px' }}>
      <div>
        <p style={{ margin: 0, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '12px', fontWeight: 700 }}>
          Tạo bài viết
        </p>
        <h1 style={{ margin: '12px 0 0', fontSize: '32px', color: '#111827' }}>
          Đăng tin tức mới cho shop
        </h1>
        <p style={{ margin: '14px 0 0', color: '#475569', fontSize: '16px', maxWidth: '680px' }}>
          Chuẩn bị nội dung cho các bài giới thiệu sản phẩm, câu chuyện thương hiệu hoặc mẹo trang trí.
        </p>
      </div>

      <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <p style={{ margin: 0, color: '#475569' }}>
          Mẫu này dành cho form tạo bài viết. Bạn có thể mở rộng thành trang quản lý nội dung đầy đủ.
        </p>
      </div>
    </div>
  );
}
