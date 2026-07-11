import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Async data hook with a stable contract.
 *
 * Returns: { data, loading, error, refetch }
 *
 * - `loading` is `true` on first run and during every refetch.
 * - `error` is `null` unless the underlying promise rejects.
 * - `refetch()` returns a promise that resolves with the data (or throws).
 */
export default function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const mountedRef = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (mountedRef.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (mountedRef.current) setState((s) => ({ ...s, loading: false, error }));
      throw error;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    run().catch(() => { /* error already captured in state */ });
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, refetch: run };
}
