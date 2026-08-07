import { apiClient } from './api-client';

export const getAdminCustomers = async (params?: { q?: string; skip?: number; take?: number }) => {
  const response = await apiClient.get('/admin/customers', { params });
  return response.data;
};

export const getAdminCustomerById = async (id: number) => {
  const response = await apiClient.get(`/admin/customers/${id}`);
  return response.data;
};

export const toggleCustomerStatus = async (id: number) => {
  const response = await apiClient.patch(`/admin/customers/${id}/toggle-status`);
  return response.data;
};
