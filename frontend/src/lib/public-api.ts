import axios from 'axios';

// Lấy URL của backend từ biến môi trường hoặc dùng mặc định
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