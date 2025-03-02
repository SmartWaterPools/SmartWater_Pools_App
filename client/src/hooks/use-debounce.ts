import { useState, useEffect } from 'react';

/**
 * A hook that debounces a value, only updating after a specified delay
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Update the debounced value after the specified delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer when the value changes again before the delay has expired
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}