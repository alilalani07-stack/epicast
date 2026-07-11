import clsx from 'clsx';

export function Table({ children, className }) {
  return (
    <div className={clsx('w-full overflow-x-auto', className)}>
      <table className="w-full text-[14px] border-separate border-spacing-0">{children}</table>
    </div>
  );
}

export function THead({ children }) {
  return (
    <thead>
      <tr>{children}</tr>
    </thead>
  );
}

export function TH({ children, className, align = 'left' }) {
  return (
    <th
      className={clsx(
        'sticky top-0 z-10 bg-surface-2/60 text-[12px] font-semibold uppercase tracking-[0.08em] text-mute',
        'px-6 py-4 border-b border-line',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }) {
  return <tbody>{children}</tbody>;
}

export function TR({ children, className, onClick }) {
  return (
    <tr
      onClick={onClick}
      className={clsx(
        'group transition-colors',
        onClick && 'cursor-pointer hover:bg-surface-2/60',
        className
      )}
    >
      {children}
    </tr>
  );
}

export function TD({ children, className, align = 'left' }) {
  return (
    <td
      className={clsx(
        'px-6 py-4 border-b border-line text-[14.5px] text-ink-2',
        align === 'right' && 'text-right tabular-nums',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className
      )}
    >
      {children}
    </td>
  );
}
