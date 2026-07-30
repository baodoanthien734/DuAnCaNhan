"use client";

import CategoryList from './CategoryList';

export default function AdminCategoriesPage() {
  return (
    <div style={{ display: 'grid', gap: '22px' }}>
      <div>
        <p style={{ margin: 0, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '12px', fontWeight: 700 }}>
          Quản lý danh mục
        </p>
        <h1 style={{ margin: '12px 0 0', fontSize: '32px', color: '#111827' }}>
          Danh mục sản phẩm
        </h1>
        <p style={{ margin: '14px 0 0', color: '#475569', fontSize: '16px', maxWidth: '680px' }}>
          Tạo, chỉnh sửa, xóa hoặc sắp xếp các danh mục trong cửa hàng handmade của bạn.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#ffffff', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>Danh sách danh mục</h2>
          <p style={{ margin: '12px 0 0', color: '#475569' }}>
            Hiện tại bạn có thể quản lý các danh mục như trang trí, quà tặng, thủ công mỹ nghệ và sản phẩm mới.
          </p>

          <CategoryList />
        </div>
      </div>
    </div>
  );
}
