import axios from 'axios';

// 1. Tạo một cổng Axios thuần túy, không kẹp Token, không đánh chặn
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const publicAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


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
  const resp = await publicAxios.get('/posts', { params });
  return resp.data; 
}

export async function getPublicPostBySlug(slug: string) {
  const resp = await publicAxios.get(`/posts/${slug}`);
  return resp.data;
}