import { apiClient } from './api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Các Interface định nghĩa kiểu dữ liệu dựa theo Form của bạn
export interface ProductVariant {
  name: string;
  sku: string;
  price: number;
  stock: number;
  image?: string;
}

export interface ProductCustomizationChoice {
  label: string;
  extraPrice: number;
}

export interface ProductCustomization {
  name: string;
  type: 'TEXT' | 'SELECT';
  isRequired: boolean;
  maxLength?: number;
  choices: ProductCustomizationChoice[];
}

export interface CreateProductDto {
  name: string;
  slug?: string;
  categoryId: number;
  description: string;
  basePrice: number;
  isPrivate: boolean;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  variants: ProductVariant[];
  customizations: ProductCustomization[];
}

export interface ListProductsParams {
  q?: string;
  categoryId?: number;
  status?: string;
  skip?: number;
  take?: number;
}

// --- CÁC HÀM GỌI API ---

export async function listProducts(params: ListProductsParams = {}) {
  const resp = await apiClient.get('/admin/products', { params });
  return resp.data; // Trả về nguyên khối { items, total } từ Backend
}

export async function createProduct(dto: CreateProductDto) {
  const resp = await apiClient.post('/admin/products', dto);
  return resp.data;
}

export async function removeProduct(id: number) {
  const resp = await apiClient.delete(`/admin/products/${id}`);
  return resp.data;
}

export async function uploadProductImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  // Gọi vào endpoint mới tạo của Backend
  const resp = await apiClient.post('/upload/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  
  return resp.data as { url: string; filename: string };
}

export async function updateProductStatus(id: number, status: string) {
  const resp = await apiClient.patch(`/admin/products/${id}/status`, { status });
  return resp.data;
}

export async function deleteProduct(id: number) {
  const resp = await apiClient.delete(`/admin/products/${id}`);
  return resp.data;
}

// Lấy chi tiết 1 sản phẩm
export async function getProduct(id: number) {
  const resp = await apiClient.get(`/admin/products/${id}`);
  return resp.data;
}

// Chuẩn bị sẵn hàm Update cho các bước tiếp theo
export async function updateProduct(id: number, data: any) {
  const resp = await apiClient.patch(`/admin/products/${id}`, data);
  return resp.data;
}

// Xóa ảnh tạm của sản phẩm trên server
export const deleteTempProductImage = async (url: string) => {
  try {
    // Thay apiClient bằng instance axios mà bạn đang dùng
    await apiClient.delete('/upload/tmp', { data: { url } });
  } catch (error) {
    console.error("Lỗi khi xóa ảnh tạm:", error);
  }
};

export default {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  removeProduct,
  uploadProductImage,
  deleteTempProductImage,
};