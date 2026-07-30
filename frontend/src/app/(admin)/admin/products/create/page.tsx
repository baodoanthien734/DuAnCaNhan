export default function AdminProductCreatePage() {
  return (
    <div style={{ display: 'grid', gap: '22px' }}>
      <div>
        <p style={{ margin: 0, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '12px', fontWeight: 700 }}>
          Tạo sản phẩm
        </p>
        <h1 style={{ margin: '12px 0 0', fontSize: '32px', color: '#111827' }}>
          Thêm sản phẩm handmade mới
        </h1>
        <p style={{ margin: '14px 0 0', color: '#475569', fontSize: '16px', maxWidth: '680px' }}>
          Điền tên sản phẩm, mô tả, giá và hình ảnh để đăng lên shop.
        </p>
      </div>

      <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <p style={{ margin: 0, color: '#475569' }}>
          Mẫu trang này chưa có form dữ liệu, nhưng đã sẵn sàng để mở rộng thành bộ công cụ quản lý sản phẩm hoàn chỉnh.
        </p>
      </div>
    </div>
  );
}
