export default function AdminProductEditPage() {
  return (
    <div style={{ display: 'grid', gap: '22px' }}>
      <div>
        <p style={{ margin: 0, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '12px', fontWeight: 700 }}>
          Chỉnh sửa sản phẩm
        </p>
        <h1 style={{ margin: '12px 0 0', fontSize: '32px', color: '#111827' }}>
          Sửa thông tin sản phẩm
        </h1>
        <p style={{ margin: '14px 0 0', color: '#475569', fontSize: '16px', maxWidth: '680px' }}>
          Cập nhật tên, mô tả, giá bán hoặc trạng thái hàng tồn cho sản phẩm đã chọn.
        </p>
      </div>

      <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <p style={{ margin: 0, color: '#475569' }}>
          Trang chỉnh sửa này là nơi bạn sẽ thêm form và thao tác để điều chỉnh mỗi sản phẩm cụ thể.
        </p>
      </div>
    </div>
  );
}
