import { apiClient } from './api-client';

export const getAdminOrders = async (params?: { status?: string; skip?: number; take?: number }) => {
  const response = await apiClient.get('/admin/orders', { params });
  return response.data;
};

export const getAdminOrderById = async (id: number) => {
  const response = await apiClient.get(`/admin/orders/${id}`);
  return response.data;
};

export const updateOrderStatus = async (id: number, status: string) => {
  const response = await apiClient.patch(`/admin/orders/${id}/status`, { status });
  return response.data;
};