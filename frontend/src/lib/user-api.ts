import { apiClient } from './api-client';

export type UpdateProfilePayload = {
  name?: string;
};

export type AddressPayload = {
  recipientName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  isDefault?: boolean;
};

export const getProfile = async () => {
  const response = await apiClient.get('/users/profile');
  return response.data;
};

export const updateProfile = async (data: UpdateProfilePayload) => {
  const response = await apiClient.patch('/users/profile', data);
  return response.data;
};

export const getAddresses = async () => {
  const response = await apiClient.get('/users/addresses');
  return response.data;
};

export const createAddress = async (data: AddressPayload) => {
  const response = await apiClient.post('/users/addresses', data);
  return response.data;
};

export const deleteAddress = async (id: number) => {
  const response = await apiClient.delete(`/users/addresses/${id}`);
  return response.data;
};

export const setDefaultAddress = async (id: number) => {
  const response = await apiClient.patch(`/users/addresses/${id}/default`);
  return response.data;
};