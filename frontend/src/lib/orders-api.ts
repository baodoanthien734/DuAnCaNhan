import { apiClient } from './api-client';

export const checkout = async (data: {
  addressId: number;
  paymentMethod: string;
  note?: string;
}) => {
  const response = await apiClient.post('/orders/checkout', data);
  return response.data;
};

export const getMyOrders = async () => {
  const response = await apiClient.get('/orders');
  return response.data;
};

export const getMyOrderById = async (id: number) => {
  const response = await apiClient.get(`/orders/${id}`);
  return response.data;
};