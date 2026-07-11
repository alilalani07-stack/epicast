import { forwardRef } from 'react';
import clsx from 'clsx';

const Textarea = forwardRef(function Textarea({ className, error, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={clsx(
        'w-full bg-surface border rounded-lg text-[14.5px] text-ink placeholder:text-faint shadow-soft',
        'px-4 py-3 transition-colors duration-150 resize-none leading-relaxed',
        'focus:outline-none focus:border-ink focus:shadow-[0_0_0_3px_rgba(10,10,10,0.06)]',
        error ? 'border-red-300' : 'border-line hover:border-line-strong',
        className
      )}
      {...props}
    />
  );
});

export default Textarea;
