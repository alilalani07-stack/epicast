import { forwardRef } from 'react';
import clsx from 'clsx';

const Input = forwardRef(function Input(
  { className, icon: Icon, iconRight: IconRight, error, ...props },
  ref
) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" strokeWidth={1.75} />
      )}
      <input
        ref={ref}
        className={clsx(
          'w-full h-11 bg-surface border rounded-lg text-[14.5px] text-ink placeholder:text-faint',
          'transition-colors duration-150 shadow-soft',
          'focus:outline-none focus:border-ink focus:shadow-[0_0_0_3px_rgba(10,10,10,0.06)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-red-300 focus:border-red-500' : 'border-line hover:border-line-strong',
          Icon ? 'pl-10' : 'pl-4',
          IconRight ? 'pr-10' : 'pr-4',
          className
        )}
        {...props}
      />
      {IconRight && (
        <IconRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" strokeWidth={1.75} />
      )}
    </div>
  );
});

export default Input;
