// This hook is used to debounce a value, meaning it will delay the update of the value until after a specified delay time has passed since the last time the value was changed. This is useful for scenarios like search input fields where you want to wait for the user to stop typing before making an API call or updating the state.
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