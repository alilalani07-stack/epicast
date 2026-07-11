import clsx from 'clsx';

export default function Panel({ children, className, padded = true, elevated = false, ...props }) {
  return (
    <div
      className={clsx(
        'bg-surface border border-line rounded-2xl',
        elevated ? 'shadow-card' : 'shadow-soft',
        padded && 'p-6 lg:p-7',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
