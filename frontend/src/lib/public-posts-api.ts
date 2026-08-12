import { apiClient } from './api-client';

export interface PublicPost {
  id: number;
  title: string;
  slug: string;
  summary: string;
  thumbnail: string | null;
  createdAt: string;
  author: {
    id: number;
    name: string;
  };
}

export async function getPublicPosts(params?: { q?: string; skip?: number; take?: number }) {
  const resp = await apiClient.get('/posts', { params });
  return resp.data; 
}

export async function getPublicPostBySlug(slug: string) {
  const resp = await apiClient.get(`/posts/${slug}`);
  return resp.data;
}

export function resolvePostImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return '';
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const normalizedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${API_BASE_URL}${normalizedPath}`;
}