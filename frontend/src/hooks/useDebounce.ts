import { useEffect, useState } from 'react';

/**
 * Hook para retrasar la emisión de un valor (debounce)
 * Evita disparar múltiples consultas al servidor mientras el usuario escribe o cambia filtros.
 */
export function useDebounce<T>(value: T, delay: number = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
