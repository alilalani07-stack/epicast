import clsx from 'clsx';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description,
  action,
  className,
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center text-center py-20 px-6', className)}>
      <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-line flex items-center justify-center text-mute mb-5">
        <Icon className="w-6 h-6" strokeWidth={1.5} />
      </div>
      <h3 className="text-[16px] font-semibold tracking-tight text-ink">{title}</h3>
      {description && (
        <p className="text-[14px] text-mute mt-2 max-w-md leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}
