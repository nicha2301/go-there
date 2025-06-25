import { useEffect, useState } from 'react';

/**
 * Hook debounce để trì hoãn thực thi một hành động
 * @param {any} value - Giá trị cần debounce
 * @param {number} delay - Thời gian trì hoãn (ms)
 * @returns {any} Giá trị sau khi debounce
 */
const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Tạo một timeout để cập nhật giá trị sau delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup timeout nếu value hoặc delay thay đổi
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce; 