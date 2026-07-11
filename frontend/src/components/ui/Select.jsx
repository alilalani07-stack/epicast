import { forwardRef } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={clsx(
          'w-full h-11 appearance-none bg-surface border border-line rounded-lg shadow-soft',
          'text-[14.5px] text-ink px-4 pr-10 hover:border-line-strong',
          'transition-colors duration-150 focus:outline-none focus:border-ink',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" strokeWidth={1.75} />
    </div>
  );
});

export default Select;
