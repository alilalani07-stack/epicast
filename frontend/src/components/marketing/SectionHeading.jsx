import { motion } from 'framer-motion';

export default function SectionHeading({ eyebrow, title, description, align = 'left', maxWidth = '720px' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={align === 'center' ? 'text-center mx-auto' : ''}
      style={{ maxWidth: align === 'center' ? maxWidth : undefined }}
    >
      {eyebrow && <div className="eyebrow mb-4">{eyebrow}</div>}
      <h2 className="display text-[40px] sm:text-[52px] lg:text-[64px] text-ink">
        {title}
      </h2>
      {description && (
        <p className="text-[16px] lg:text-[18px] text-mute mt-5 leading-relaxed" style={{ maxWidth }}>
          {description}
        </p>
      )}
    </motion.div>
  );
}
