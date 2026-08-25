/**
 * @fileoverview Custom React Hook để debounce giá trị (trì hoãn cập nhật)
 * 
 * Use case:
 * - Search input: Chỉ gọi API khi user ngừng gõ
 * - Auto-complete: Tránh gọi API quá nhiều khi user đang gõ
 * - Form validation: Chỉ validate khi user ngừng nhập
 * 
 * Mechanics:
 * - Sử dụng setTimeout để delay update
 * - Cleanup function clearTimeout khi value hoặc delay thay đổi
 * - Trả về giá trị đã debounce
 * 
 * @example
 * const debouncedSearch = useDebounce(searchTerm, 500);
 * // Chỉ gọi API khi searchTerm ngừng thay đổi trong 500ms
 */
import { useState, useEffect } from 'react';

// Hook này giúp trì hoãn việc cập nhật giá trị cho đến khi người dùng ngừng gõ sau một khoảng thời gian (delay)
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Thiết lập một bộ đếm giờ
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Xóa bộ đếm giờ nếu value thay đổi (người dùng đang gõ tiếp)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}