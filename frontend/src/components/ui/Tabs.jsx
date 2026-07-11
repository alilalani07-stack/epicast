import clsx from 'clsx';
import { motion } from 'framer-motion';

export default function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={clsx('relative inline-flex items-center gap-1 p-1 bg-surface-2 border border-line rounded-xl', className)}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            type="button"
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={clsx(
              'relative px-3.5 h-8 rounded-lg text-[12.5px] font-medium transition-colors',
              active ? 'text-ink' : 'text-mute hover:text-ink'
            )}
          >
            {active && (
              <motion.span
                layoutId={`tabs-${tabs.map((t) => t.value).join('-')}`}
                className="absolute inset-0 bg-surface border border-line rounded-lg shadow-soft"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
