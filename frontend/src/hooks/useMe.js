import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCurrentUser } from '../services/auth.js';

export default function useMe({ manual = false } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchCurrentUser(controller.signal);
      setData(result);
      return result;
    } catch (err) {
      if (err?.name === 'AbortError') {
        return null;
      }
      setError(err);
      throw err;
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!manual) {
      load().catch(() => {
        if (mounted) {
          // el error ya se asigno en estado
        }
      });
    }

    return () => {
      mounted = false;
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [load, manual]);

  return {
    data,
    user: data?.user || null,
    groups: data?.groups || [],
    permissions: data?.permissions || [],
    loading,
    error,
    refresh: load
  };
}
