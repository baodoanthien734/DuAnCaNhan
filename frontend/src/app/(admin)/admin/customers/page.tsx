export default function AdminCustomersPage() {
  return (
    <div style={{ display: 'grid', gap: '22px' }}>
      <div>
        <p style={{ margin: 0, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '12px', fontWeight: 700 }}>
          Khách hàng
        </p>
        <h1 style={{ margin: '12px 0 0', fontSize: '32px', color: '#111827' }}>
          Quản lý khách hàng
        </h1>
        <p style={{ margin: '14px 0 0', color: '#475569', fontSize: '16px', maxWidth: '680px' }}>
          Xem danh sách khách hàng thân thiết, theo dõi thông tin liên hệ và nhu cầu mua sắm.
        </p>
      </div>

      <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>Khách hàng thân thiết</h2>
        <p style={{ margin: '12px 0 0', color: '#475569' }}>
          Quản lý thông tin khách hàng, đơn hàng lặp lại và chương trình ưu đãi dành cho khách hàng cũ.
        </p>
      </div>
    </div>
  );
}
