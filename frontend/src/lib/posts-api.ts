import { apiClient } from './api-client';

export const listPosts = async (params: {
  q?: string;
  isPublished?: string;
  skip?: number;
  take?: number;
}) => {
  const response = await apiClient.get('/admin/posts', { params });
  return response.data;
};

//Lấy chi tiết một bài viết để đổ dữ liệu cũ vào Form
export const getPostById = async (id: string | number) => {
  const response = await apiClient.get(`/admin/posts/${id}`);
  return response.data;
};

//Gửi dữ liệu cập nhật bài viết lên server
//Sử dụng FormData để hỗ trợ upload cả text lẫn file (ảnh)
export const updatePost = async (id: string | number, formData: FormData) => {
  const response = await apiClient.patch(`/admin/posts/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};