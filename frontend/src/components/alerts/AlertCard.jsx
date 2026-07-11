import { motion } from 'framer-motion';
import { Bell, Check, CheckCheck, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import clsx from 'clsx';

const SEVERITY_META = {
  critical: { icon: ShieldAlert, badge: 'critical', label: 'Critical', accent: 'before:bg-red-500' },
  high: { icon: AlertTriangle, badge: 'high', label: 'High', accent: 'before:bg-orange-500' },
  moderate: { icon: Bell, badge: 'moderate', label: 'Moderate', accent: 'before:bg-amber-500' },
  low: { icon: Info, badge: 'low', label: 'Low', accent: 'before:bg-emerald-500' },
};

const STATUS_META = {
  active: { label: 'Active', variant: 'danger' },
  acknowledged: { label: 'Acknowledged', variant: 'warning' },
  resolved: { label: 'Resolved', variant: 'success' },
};

export default function AlertCard({ alert, onAcknowledge, onResolve, index = 0, compact = false }) {
  const meta = SEVERITY_META[alert.severity] || SEVERITY_META.low;
  const status = STATUS_META[alert.status] || STATUS_META.active;
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={clsx(
        'relative bg-surface border border-line rounded-2xl p-6 shadow-soft hover:shadow-card transition-shadow',
        'before:absolute before:left-0 before:top-5 before:bottom-5 before:w-[3px] before:rounded-r-full',
        meta.accent
      )}
    >
      <div className="flex items-start gap-4 pl-2">
        <div className="w-11 h-11 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-ink-2 shrink-0">
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-[15.5px] font-semibold tracking-tight text-ink">{alert.title}</h4>
                <Badge variant={meta.badge} dot>{meta.label}</Badge>
                <Badge variant={status.variant} dot>{status.label}</Badge>
              </div>
              <p className="text-[14px] text-mute mt-2 line-clamp-2 leading-relaxed">{alert.message}</p>
            </div>
          </div>

          {!compact && (
            <div className="flex items-center justify-between mt-5 pt-5 border-t border-line">
              <div className="flex items-center gap-3 text-[12.5px] text-mute">
                <span>{alert.area}</span>
                <span className="w-1 h-1 rounded-full bg-line-strong" />
                <span>{alert.disease}</span>
                <span className="w-1 h-1 rounded-full bg-line-strong" />
                <span>{alert.time}</span>
              </div>
              <div className="flex items-center gap-2">
                {alert.status === 'active' && (
                  <Button size="sm" variant="ghost" icon={Check} onClick={() => onAcknowledge?.(alert)}>
                    Acknowledge
                  </Button>
                )}
                {alert.status !== 'resolved' && (
                  <Button size="sm" variant="secondary" icon={CheckCheck} onClick={() => onResolve?.(alert)}>
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
