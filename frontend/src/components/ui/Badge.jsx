import clsx from 'clsx';

const variants = {
  neutral: 'bg-surface-2 text-ink-2 border-line',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  danger: 'bg-red-50 text-red-700 border-red-100',
  critical: 'bg-red-50 text-red-700 border-red-200',
  low: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  moderate: 'bg-amber-50 text-amber-700 border-amber-100',
  high: 'bg-orange-50 text-orange-700 border-orange-100',
  ink: 'bg-ink text-white border-ink',
  outline: 'bg-transparent text-ink-2 border-line-strong',
};

const dotColor = {
  neutral: 'bg-neutral-400',
  info: 'bg-blue-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  critical: 'bg-red-500',
  low: 'bg-emerald-500',
  moderate: 'bg-amber-500',
  high: 'bg-orange-500',
  ink: 'bg-white',
  outline: 'bg-neutral-400',
};

export default function Badge({ children, variant = 'neutral', dot = false, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12.5px] font-medium border tabular-nums tracking-tight',
        variants[variant],
        className
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColor[variant])} />}
      {children}
    </span>
  );
}
