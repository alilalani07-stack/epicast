import { forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-ink text-white hover:bg-[#1f1f1f] active:bg-[#2a2a2a] border border-ink shadow-soft',
  secondary:
    'bg-surface text-ink hover:bg-surface-2 active:bg-surface-3 border border-line shadow-soft',
  ghost:
    'bg-transparent text-ink hover:bg-surface-2 active:bg-surface-3 border border-transparent',
  outline:
    'bg-transparent text-ink hover:bg-surface-2 border border-line-strong',
  danger:
    'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200',
  success:
    'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200',
  invert:
    'bg-white text-ink hover:bg-neutral-100 border border-white/10',
};

const sizes = {
  xs: 'h-8 px-3 text-[12.5px] gap-1.5 rounded-md',
  sm: 'h-9 px-3.5 text-[13.5px] gap-2 rounded-lg',
  md: 'h-10 px-4 text-[14px] gap-2 rounded-lg',
  lg: 'h-11 px-5 text-[14.5px] gap-2 rounded-lg',
  xl: 'h-12 px-6 text-[15px] gap-2.5 rounded-xl',
};

const iconSizeFor = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-4 h-4',
  lg: 'w-4 h-4',
  xl: 'w-4 h-4',
};

const Button = forwardRef(function Button(
  {
    children,
    variant = 'secondary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon,
    iconRight: IconRight,
    className,
    type = 'button',
    ...props
  },
  ref
) {
  const iconCls = iconSizeFor[size] || 'w-4 h-4';
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-medium select-none',
        'transition-[background-color,border-color,color,transform] duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-[0.985]',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className={clsx(iconCls, 'animate-spin')} />
      ) : (
        Icon && <Icon className={iconCls} strokeWidth={2} />
      )}
      {children}
      {IconRight && !loading && <IconRight className={iconCls} strokeWidth={2} />}
    </button>
  );
});

export default Button;
