import { useEffect, useState } from 'react';

// Retorna `value` após `delayMs` sem alterações. Útil para evitar buscas/filtros
// a cada keystroke em inputs de pesquisa.
export function useDebouncedValue<T>(value: T, delayMs = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
