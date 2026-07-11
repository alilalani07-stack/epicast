import ErrorState from './ErrorState.jsx';

/**
 * Tiny boundary that picks the right UI given a {loading, error, data} tuple.
 *
 * Usage:
 *   <AsyncBoundary loading={loading} error={error} onRetry={refetch} skeleton={<MapSkeleton />}>
 *     <RealContent />
 *   </AsyncBoundary>
 */
export default function AsyncBoundary({
  loading,
  error,
  onRetry,
  skeleton,
  empty,
  isEmpty,
  children,
  compactError = false,
}) {
  if (loading) return skeleton || null;
  if (error) return <ErrorState error={error} onRetry={onRetry} compact={compactError} />;
  if (isEmpty && empty) return empty;
  return children;
}
