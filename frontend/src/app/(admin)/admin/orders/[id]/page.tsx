export default function AdminOrderDetailPage() {
  return (
    <div style={{ display: 'grid', gap: '22px' }}>
      <div>
        <p style={{ margin: 0, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '12px', fontWeight: 700 }}>
          Chi tiết đơn hàng
        </p>
        <h1 style={{ margin: '12px 0 0', fontSize: '32px', color: '#111827' }}>
          Xem chi tiết đơn hàng
        </h1>
        <p style={{ margin: '14px 0 0', color: '#475569', fontSize: '16px', maxWidth: '680px' }}>
          Kiểm tra trạng thái, địa chỉ giao hàng và ghi chú của khách cho từng đơn.
        </p>
      </div>

      <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <p style={{ margin: 0, color: '#475569' }}>
          Đây là trang chi tiết đơn hàng; bạn có thể bổ sung giao diện xem sản phẩm, trạng thái và hành động cập nhật.
        </p>
      </div>
    </div>
  );
}
