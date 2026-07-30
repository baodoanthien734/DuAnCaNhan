export default function AdminReviewsPage() {
  return (
    <div style={{ display: 'grid', gap: '22px' }}>
      <div>
        <p style={{ margin: 0, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '12px', fontWeight: 700 }}>
          Quản lý đánh giá
        </p>
        <h1 style={{ margin: '12px 0 0', fontSize: '32px', color: '#111827' }}>
          Nhận xét và đánh giá sản phẩm
        </h1>
        <p style={{ margin: '14px 0 0', color: '#475569', fontSize: '16px', maxWidth: '680px' }}>
          Xem và phản hồi đánh giá của khách hàng để nâng cao trải nghiệm mua hàng.
        </p>
      </div>

      <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>Phản hồi khách hàng</h2>
        <p style={{ margin: '12px 0 0', color: '#475569' }}>
          Quản lý đánh giá, trả lời thắc mắc và làm mới lời giới thiệu sản phẩm.
        </p>
      </div>
    </div>
  );
}
