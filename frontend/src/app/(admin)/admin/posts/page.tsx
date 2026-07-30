export default function AdminPostsPage() {
  return (
    <div style={{ display: 'grid', gap: '22px' }}>
      <div>
        <p style={{ margin: 0, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '12px', fontWeight: 700 }}>
          Quản lý bài viết
        </p>
        <h1 style={{ margin: '12px 0 0', fontSize: '32px', color: '#111827' }}>
          Nội dung và câu chuyện của shop
        </h1>
        <p style={{ margin: '14px 0 0', color: '#475569', fontSize: '16px', maxWidth: '680px' }}>
          Tạo bài viết chia sẻ quy trình làm đồ thủ công, cập nhật sự kiện và tin tức cửa hàng.
        </p>
      </div>

      <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>Bài viết nổi bật</h2>
        <p style={{ margin: '12px 0 0', color: '#475569' }}>
          Trưng bày các bài viết cảm hứng, hướng dẫn và tin tức mới nhất dành cho khách hàng.
        </p>
      </div>
    </div>
  );
}
