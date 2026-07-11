import clsx from 'clsx';
export default function Label({ children, className, required, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className={clsx('block text-[13.5px] font-medium text-ink-2 mb-2', className)}>
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}
