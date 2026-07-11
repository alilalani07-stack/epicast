import { motion } from 'framer-motion';

export default function PageHeader({ title, description, actions, eyebrow }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12 lg:mb-16"
    >
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow text-[12px] mb-4">{eyebrow}</div>}
        <h1 className="display text-[48px] lg:text-[64px] text-ink">
          {title}
        </h1>
        {description && (
          <p className="text-[17px] lg:text-[19px] text-mute mt-5 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </motion.div>
  );
}
