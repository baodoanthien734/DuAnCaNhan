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
  // Bước 5.1: Lấy thông tin chi tiết danh mục để có ID
  const category = await getPublicCategoryBySlug(slug);
  
  // Bước 5.2: Dùng ID đó gọi lấy danh sách sản phẩm thông qua api products đã có sẵn
  const productsData = await getPublicProducts({
    categoryId: category.id,
    ...params,
  });

  return {
    category,
    products: Array.isArray(productsData) ? productsData : productsData.items || [],
    total: productsData.total || 0,
  };
}