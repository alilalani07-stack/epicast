import clsx from 'clsx';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useEffect, useState } from 'react';

function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (typeof target !== 'number') return setVal(target);
    let start = 0;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(start + (target - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export default function MetricCard({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  hint,
  index = 0,
  format = (v) => v?.toLocaleString?.() ?? v,
  suffix,
}) {
  const isNumeric = typeof value === 'number';
  const animated = useCountUp(isNumeric ? value : 0);
  const display = isNumeric ? format(animated) : value;

  const trend =
    typeof delta === 'number' ? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat') : null;

  const trendStyles = {
    up: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    down: 'text-red-700 bg-red-50 border-red-100',
    flat: 'text-mute bg-surface-2 border-line',
  };

  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className="group relative bg-surface border border-line rounded-2xl p-7 shadow-soft hover:shadow-card transition-shadow"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="text-[14px] font-medium text-mute">{label}</div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-ink-2">
            <Icon className="w-4 h-4" strokeWidth={1.75} />
          </div>
        )}
      </div>

      <div className="mt-6 flex items-baseline gap-2">
        <div className="display text-[52px] lg:text-[56px] text-ink tabular-nums leading-none">
          {display}
        </div>
        {suffix && <div className="text-[16px] text-mute font-medium">{suffix}</div>}
      </div>

      <div className="mt-6 flex items-center justify-between">
        {trend ? (
          <div className={clsx(
            'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[13px] font-medium border tabular-nums',
            trendStyles[trend]
          )}>
            <TrendIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
            {Math.abs(delta)}%
            {deltaLabel && <span className="text-mute font-normal ml-1">{deltaLabel}</span>}
          </div>
        ) : (
          <span />
        )}
        {hint && <div className="text-[13px] text-faint">{hint}</div>}
      </div>
    </motion.div>
  );
}
