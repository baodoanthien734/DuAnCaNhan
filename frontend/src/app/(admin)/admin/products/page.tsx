import Link from 'next/link';

export default function AdminProductsPage() {
  return (
    <div style={{ display: 'grid', gap: '22px' }}>
      <div>
        <p style={{ margin: 0, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '12px', fontWeight: 700 }}>
          Quản lý sản phẩm
        </p>
        <h1 style={{ margin: '12px 0 0', fontSize: '32px', color: '#111827' }}>
          Danh sách sản phẩm handmade
        </h1>
        <p style={{ margin: '14px 0 0', color: '#475569', fontSize: '16px', maxWidth: '680px' }}>
          Xem và chỉnh sửa thông tin sản phẩm, giá bán, tồn kho và trạng thái hiển thị.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link
          href="/admin/products/create"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px 22px',
            borderRadius: '18px',
            backgroundColor: '#2563eb',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Thêm sản phẩm mới
        </Link>
      </div>

      <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>Sản phẩm nổi bật</h2>
        <p style={{ margin: '12px 0 0', color: '#475569' }}>
          Đây là khu vực để hiển thị sản phẩm bán chạy, sản phẩm mới và những mặt hàng cần cập nhật nhanh.
        </p>
      </div>
    </div>
  );
}
