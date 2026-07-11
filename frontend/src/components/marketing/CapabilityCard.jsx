import { motion } from 'framer-motion';

export default function CapabilityCard({ icon: Icon, title, description, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="group relative bg-surface border border-line rounded-2xl p-8 lg:p-10 shadow-soft hover:shadow-card transition-shadow h-full"
    >
      <div className="w-14 h-14 rounded-2xl bg-canvas border border-line flex items-center justify-center mb-7">
        <Icon className="w-6 h-6 text-ink" strokeWidth={1.6} />
      </div>
      <h3 className="text-[22px] lg:text-[24px] font-semibold tracking-tight text-ink leading-tight">
        {title}
      </h3>
      <p className="text-[14.5px] text-mute leading-relaxed mt-3">
        {description}
      </p>
    </motion.div>
  );
}
