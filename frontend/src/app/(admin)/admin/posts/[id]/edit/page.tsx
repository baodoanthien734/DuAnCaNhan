export default function AdminPostEditPage() {
  return (
    <div style={{ display: 'grid', gap: '22px' }}>
      <div>
        <p style={{ margin: 0, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '12px', fontWeight: 700 }}>
          Chỉnh sửa bài viết
        </p>
        <h1 style={{ margin: '12px 0 0', fontSize: '32px', color: '#111827' }}>
          Sửa nội dung và tiêu đề bài viết
        </h1>
        <p style={{ margin: '14px 0 0', color: '#475569', fontSize: '16px', maxWidth: '680px' }}>
          Cập nhật các bài viết hiện có để giữ nội dung shop luôn mới mẻ và hấp dẫn.
        </p>
      </div>

      <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <p style={{ margin: 0, color: '#475569' }}>
          Trang này đã sẵn sàng để thêm form chỉnh sửa nội dung theo từng bài viết.
        </p>
      </div>
    </div>
  );
}
