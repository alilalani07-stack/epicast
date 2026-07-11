import clsx from 'clsx';

/**
 * Single skeleton block. Use the helpers below for common shapes.
 */
export default function Skeleton({ className, rounded = 'md' }) {
  const r = {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  }[rounded];
  return <div className={clsx('bg-surface-2 shimmer', r, className)} />;
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

export function MetricCardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-line rounded-2xl p-6 shadow-soft"
        >
          <div className="flex items-start justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-9" rounded="xl" />
          </div>
          <Skeleton className="h-10 w-32 mt-5" rounded="lg" />
          <div className="mt-5 flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 360 }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-surface-2/40 border border-line"
      style={{ height }}
    >
      <div className="absolute inset-x-0 bottom-8 flex items-end justify-around px-6 gap-3 h-3/4">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-surface-2 shimmer rounded-t"
            style={{ height: `${30 + ((i * 13) % 70)}%` }}
          />
        ))}
      </div>
      <div className="absolute left-0 right-0 bottom-2 px-6 flex justify-between">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-2 w-8" />
        ))}
      </div>
    </div>
  );
}

export function MapSkeleton({ height = 680 }) {
  return (
    <div
      className="relative overflow-hidden bg-[#f4f3ee] border-y border-line"
      style={{ height }}
    >
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute inset-0 shimmer opacity-50" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 text-[12.5px] text-mute bg-surface/90 border border-line rounded-full px-4 py-2 shadow-soft">
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-ink ping-ring" />
            <span className="relative w-2 h-2 rounded-full bg-ink" />
          </span>
          Loading map intelligence…
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 6 }) {
  return (
    <div className="w-full">
      <div className="px-5 py-3 border-b border-line bg-surface-2/40 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="px-5 py-4 border-b border-line grid gap-4 items-center"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={c === cols - 1 ? 'h-3.5 w-16' : 'h-3.5 w-full max-w-[200px]'} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function AlertFeedSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface border border-line rounded-2xl p-5 shadow-soft">
          <div className="flex items-start gap-4">
            <Skeleton className="h-10 w-10" rounded="xl" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-3.5 w-3/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ lines = 3, withHeader = true, height }) {
  return (
    <div
      className="bg-surface border border-line rounded-2xl p-6 shadow-soft"
      style={height ? { height } : undefined}
    >
      {withHeader && (
        <div className="space-y-2 mb-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-40" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={`h-3.5 ${i === lines - 1 ? 'w-3/5' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}
