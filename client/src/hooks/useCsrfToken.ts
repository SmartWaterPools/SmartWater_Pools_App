import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await apiRequest('/api/csrf-token');
        setCsrfToken(response.csrfToken);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch CSRF token:', err);
        setError('Failed to fetch CSRF token');
      } finally {
        setLoading(false);
      }
    };

    fetchCsrfToken();
  }, []);

  const refreshToken = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/csrf-token');
      setCsrfToken(response.csrfToken);
      setError(null);
    } catch (err) {
      console.error('Failed to refresh CSRF token:', err);
      setError('Failed to refresh CSRF token');
    } finally {
      setLoading(false);
    }
  };

  return { csrfToken, loading, error, refreshToken };
}