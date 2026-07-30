export default function AdminOrdersPage() {
  return (
    <div style={{ display: 'grid', gap: '22px' }}>
      <div>
        <p style={{ margin: 0, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '12px', fontWeight: 700 }}>
          Quản lý đơn hàng
        </p>
        <h1 style={{ margin: '12px 0 0', fontSize: '32px', color: '#111827' }}>
          Đơn hàng cần xử lý
        </h1>
        <p style={{ margin: '14px 0 0', color: '#475569', fontSize: '16px', maxWidth: '680px' }}>
          Xem trạng thái đơn hàng, đóng gói và giao hàng cho khách hàng yêu thích đồ thủ công.
        </p>
      </div>

      <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>Đơn hàng mới</h2>
        <p style={{ margin: '12px 0 0', color: '#475569' }}>
          Các đơn mới nhất sẽ xuất hiện ở đây, bao gồm thông tin khách hàng và trạng thái vận chuyển.
        </p>
      </div>
    </div>
  );
}
