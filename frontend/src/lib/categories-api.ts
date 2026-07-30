import { apiClient } from './api-client';

export interface Category {
  id: number;
  name: string;
  slug?: string | null;
  parentId?: number | null;
  position?: number | null;
  isActive?: boolean | null;
  image?: string | null;
  metaTitle?: string | null;
  metaDesc?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ListCategoriesParams {
  q?: string;
  parentId?: number;
  skip?: number;
  take?: number;
}

export async function listCategories(params: ListCategoriesParams = {}) {
  const resp = await apiClient.get('/admin/categories', { params });
  // Backend returns { items, total } — normalize to items array for compatibility
  if (resp.data && Array.isArray(resp.data.items)) return resp.data.items as Category[];
  return resp.data as Category[];
}

export async function getCategory(id: number) {
  const resp = await apiClient.get(`/admin/categories/${id}`);
  return resp.data as Category;
}

export async function createCategory(dto: Partial<Category>) {
  const resp = await apiClient.post('/admin/categories', dto);
  return resp.data as Category;
}

export async function updateCategory(id: number, dto: Partial<Category>) {
  const resp = await apiClient.put(`/admin/categories/${id}`, dto);
  return resp.data as Category;
}

export async function uploadCategoryImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const resp = await apiClient.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp.data as { url: string; filename: string };
}

export async function removeCategory(id: number) {
  const resp = await apiClient.delete(`/admin/categories/${id}`);
  return resp.data;
}

export async function reorderCategories(updates: { id: number; position: number }[]) {
  const resp = await apiClient.post('/admin/categories/reorder', updates);
  return resp.data;
}

export default {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  removeCategory,
  reorderCategories,
};
