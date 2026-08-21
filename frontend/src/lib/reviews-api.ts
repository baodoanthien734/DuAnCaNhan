import { apiClient } from './api-client';

// 1. Hàm upload từng ảnh lên thư mục product-{id}
export const uploadReviewImage = async (productId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  // MỚI: Chỉ gọi /upload/reviews, không truyền productId trên URL nữa
  const response = await apiClient.post(`/upload/reviews`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data; 
};

// 2. Hàm submit toàn bộ form Đánh giá
export const submitReview = async (data: { 
  productId: number; 
  orderId: number; 
  rating: number; 
  comment?: string; 
  images?: string[] 
}) => {
  const response = await apiClient.post('/reviews', data);
  return response.data;
};

// 3. Hàm lấy danh sách đánh giá của 1 sản phẩm
export const getProductReviews = async (productId: number, params?: { skip?: number; take?: number }) => {
  const response = await apiClient.get(`/reviews/product/${productId}`, { params });
  return response.data;
};

// 4. Sửa đánh giá
export const updateReview = async (id: number, data: { rating?: number; comment?: string; images?: string[] }) => {
  const response = await apiClient.patch(`/reviews/${id}`, data);
  return response.data;
};

// 5. Xóa đánh giá
export const deleteReview = async (id: number) => {
  const response = await apiClient.delete(`/reviews/${id}`);
  return response.data;
};