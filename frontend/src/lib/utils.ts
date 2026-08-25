// src/lib/utils.ts

export function resolveImageUrl(url?: string | null) {
  if (!url) return '';
  
  // Nếu url đã có sẵn http (link ngoài) hoặc là blob/data preview thì giữ nguyên
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  
  // Tự động lấy URL backend từ biến môi trường
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://localhost:3001';
  
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}
