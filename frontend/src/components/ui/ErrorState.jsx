import { AlertTriangle, RefreshCcw, WifiOff } from 'lucide-react';
import Button from './Button.jsx';
import clsx from 'clsx';

export default function ErrorState({ error, onRetry, compact = false, className }) {
  const status = error?.status;
  const message = error?.message || (typeof error === 'string' ? error : 'Something went wrong.');
  const isNetwork = !status && /network|fetch|failed/i.test(message);

  const Icon = isNetwork ? WifiOff : AlertTriangle;

  const title = isNetwork
    ? 'Connection problem'
    : status === 401
      ? 'Session expired'
      : status === 403
        ? 'Access denied'
        : status >= 500
          ? 'Server error'
          : 'Something went wrong';

  const description = isNetwork
    ? "We couldn't reach the server. Check your connection and try again."
    : status === 401
      ? 'Please sign in again to continue.'
      : status === 403
        ? "You don't have permission to view this resource."
        : message;

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-12 px-6' : 'py-20 px-6',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-5">
        <Icon className="w-6 h-6" strokeWidth={1.5} />
      </div>
      <h3 className="text-[16px] font-semibold tracking-tight text-ink">{title}</h3>
      <p className="text-[14px] text-mute mt-2 max-w-md leading-relaxed">{description}</p>
      {onRetry && (
        <div className="mt-7">
          <Button variant="secondary" icon={RefreshCcw} size="lg" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
