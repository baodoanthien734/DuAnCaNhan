import { apiClient } from './api-client';

export type UpdateProfilePayload = {
  name?: string;
  avatarFile?: File | null;
  removeAvatar?: boolean;
};

export type AddressPayload = {
  recipientName: string;
  phone: string;
  street: string;
  ward: string;
  city: string;
  isDefault?: boolean;
};

export const getProfile = async () => {
  const response = await apiClient.get('/users/profile');
  return response.data;
};

export const updateProfile = async (data: UpdateProfilePayload) => {
  const formData = new FormData();

  if (data.name !== undefined) {
    formData.append('name', data.name);
  }

  if (data.removeAvatar !== undefined) {
    formData.append('removeAvatar', String(data.removeAvatar));
  }

  if (data.avatarFile) {
    formData.append('avatar', data.avatarFile);
  }

  const response = await apiClient.patch('/users/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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