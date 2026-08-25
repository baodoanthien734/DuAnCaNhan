/**
 * @fileoverview API client cho public endpoints (không cần authentication)
 * 
 * Chức năng chính:
 * - Products: Xem sản phẩm public
 * - Categories: Xem danh mục public
 * - Posts: Xem blog public
 * - Cart: Validate guest cart
 * 
 * Đặc điểm:
 * - Không gắn Bearer token
 * - Chỉ trả về active published content
 * - Hỗ trợ search, filter, pagination
 * 
 * Endpoints:
 * - GET /public/products - List sản phẩm active
 * - GET /public/products/:slug - Chi tiết sản phẩm
 * - GET /public/categories - Tree danh mục
 * - GET /public/posts - Bài viết published
 * - POST /public/cart/validate - Validate guest cart
 */
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const publicApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Lấy danh sách danh mục công khai
export async function getPublicCategories() {
  const response = await publicApi.get('/categories');
  return response.data;
}

// 2. Lấy danh sách sản phẩm công khai (hỗ trợ tìm kiếm, lọc theo danh mục, phân trang)
export async function getPublicProducts(params?: { q?: string; categoryId?: string | number; skip?: number; take?: number }) {
  const response = await publicApi.get('/products', { params });
  return response.data; // Thường trả về { items: [...], total: ... }
}

// 3. Lấy chi tiết sản phẩm theo slug
export async function getPublicProductBySlug(slug: string) {
  const response = await publicApi.get(`/products/${slug}`);
  return response.data;
}

// 4. Lấy thông tin danh mục theo slug (Public)
export async function getPublicCategoryBySlug(slug: string) {
  const response = await publicApi.get(`/categories/${slug}`);
  return response.data;
}

// 5. Lấy danh mục kèm theo danh sách sản phẩm thuộc danh mục đó
export async function getPublicProductsByCategorySlug(slug: string, params?: { skip?: number; take?: number }) {
  // Bước 5.1: Gọi API mới nâng cấp, lấy một cục data to đùng
  const categoryData = await getPublicCategoryBySlug(slug);
  
  // Bước 5.2: Truyền chuỗi các ID (ví dụ: '1,5,8') sang API tìm Sản phẩm
  const productsData = await getPublicProducts({
    categoryId: categoryData.allSubCategoryIds.join(','), 
    ...params,
  });

  return {
    category: categoryData.category,
    breadcrumbs: categoryData.breadcrumbs,
    children: categoryData.children,
    products: Array.isArray(productsData) ? productsData : productsData.items || [],
    total: productsData.total || 0,
  };
}