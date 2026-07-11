import { motion } from 'framer-motion';
import { Wordmark } from '../layout/Logo.jsx';

/**
 * Minimal full-screen splash shown while auth state is initializing.
 * Prevents a flash of unauthenticated UI.
 */
export default function BootSplash() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-6"
      >
        <Wordmark size={18} />
        <div className="flex items-center gap-2 text-[12.5px] text-mute">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-ink"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-ink"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.15 }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-ink"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
          />
        </div>
      </motion.div>
    </div>
  );
}
