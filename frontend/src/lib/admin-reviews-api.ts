import { apiClient } from './api-client';

export const getAdminReviews = async (
  params: { 
    skip?: number; 
    take?: number; 
    productId?: string; 
    q?: string;
    rating?: number;        // <--- Bổ sung kiểu cho lọc theo Sao
    replyStatus?: string;   // <--- Bổ sung kiểu cho lọc Trạng thái trả lời
  } = {}
) => {
  const response = await apiClient.get('/admin/reviews', { params });
  return response.data; 
};

export const replyAdminReview = async (id: number, adminReply: string) => {
  const response = await apiClient.patch(`/admin/reviews/${id}/reply`, { adminReply });
  return response.data;
};

export const deleteAdminReview = async (id: number) => {
  const response = await apiClient.delete(`/admin/reviews/${id}`);
  return response.data;
};