import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { X, ShieldCheck, Stethoscope, ArrowRight, Check } from 'lucide-react';

/**
 * Get Started → Role selection.
 *
 * Single source of truth for the "select your access" flow.
 * Routes to /login?role=authority or /login?role=clinic.
 */
export default function GetStartedModal({ open, onClose }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // lock scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const choose = (role) => {
    onClose?.();
    // replace: true — the modal is a flow step, not a page.
    // Back from /login should NOT loop back through the landing overlay.
    navigate(`/login?role=${role}`, { replace: true });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-3xl bg-surface border border-line rounded-3xl shadow-lift overflow-hidden"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-9 h-9 rounded-md flex items-center justify-center text-mute hover:text-ink hover:bg-surface-2 transition z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="px-8 sm:px-12 pt-12 pb-8 text-center border-b border-line">
              <div className="eyebrow mb-3">Get started</div>
              <h2 className="display text-[34px] sm:text-[42px] text-ink">
                Choose your access
              </h2>
              <p className="text-[14.5px] text-mute mt-3 max-w-md mx-auto leading-relaxed">
                EpiCast serves two roles. Select the one that matches your work.
              </p>
            </div>

            {/* Choices */}
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <RoleCard
                role="authority"
                title="Authority Access"
                description="Monitor outbreaks, forecast trends, manage risk zones and respond to alerts across regions."
                icon={ShieldCheck}
                bullets={[
                  'Intelligence dashboard',
                  'Risk zones & hotspots',
                  'Forecasting & alerts',
                ]}
                hovered={hovered === 'authority'}
                onHover={() => setHovered('authority')}
                onLeave={() => setHovered(null)}
                onSelect={() => choose('authority')}
              />
              <RoleCard
                role="clinic"
                title="Clinic Access"
                description="Submit case and death reports from the field and review your clinic's submission history."
                icon={Stethoscope}
                bullets={[
                  'Submit case reports',
                  'Submit death reports',
                  'View submission history',
                ]}
                hovered={hovered === 'clinic'}
                onHover={() => setHovered('clinic')}
                onLeave={() => setHovered(null)}
                onSelect={() => choose('clinic')}
              />
            </div>

            <div className="px-8 sm:px-12 pb-8 pt-1 text-center">
              <p className="text-[12.5px] text-mute">
                Don't have an account?{' '}
                <button
                  className="text-ink font-medium hover:underline"
                  onClick={() => { onClose?.(); navigate('/register'); }}
                >
                  Create one
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function RoleCard({ title, description, icon: Icon, bullets, hovered, onHover, onLeave, onSelect }) {
  return (
    <motion.button
      type="button"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onSelect}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative text-left p-7 rounded-2xl border transition-all
        ${hovered ? 'bg-canvas border-ink shadow-card' : 'bg-canvas border-line shadow-soft hover:border-line-strong'}`}
    >
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-xl bg-surface border border-line flex items-center justify-center">
          <Icon className="w-5 h-5 text-ink" strokeWidth={1.75} />
        </div>
        <ArrowRight
          className={`w-4 h-4 transition-all ${hovered ? 'text-ink translate-x-1' : 'text-faint'}`}
          strokeWidth={2}
        />
      </div>

      <h3 className="text-[20px] font-semibold tracking-tight text-ink mt-5">{title}</h3>
      <p className="text-[13.5px] text-mute mt-2 leading-relaxed">{description}</p>

      <ul className="mt-5 space-y-2">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-2 text-[12.5px] text-ink-2">
            <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.25} />
            {b}
          </li>
        ))}
      </ul>
    </motion.button>
  );
}
