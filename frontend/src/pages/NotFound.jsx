import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Home } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import { Wordmark } from '../components/layout/Logo.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { ROLES } from '../services/auth.service.js';

export default function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();

  const home = !isAuthenticated
    ? '/'
    : role === ROLES.AUTHORITY
      ? '/authority/dashboard'
      : '/clinic/dashboard';
  const homeLabel = !isAuthenticated
    ? 'Back home'
    : role === ROLES.AUTHORITY
      ? 'Authority dashboard'
      : 'Clinic dashboard';

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(home, { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas text-ink relative overflow-hidden flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative text-center max-w-md"
      >
        <div className="flex justify-center mb-8"><Wordmark size={20} /></div>
        <div className="eyebrow mb-4">Error · 404</div>
        <h1 className="display text-[64px] text-ink leading-none">Not found</h1>
        <p className="text-[15.5px] text-mute mt-5 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-9 flex items-center justify-center gap-2 flex-wrap">
          <Button variant="secondary" icon={ArrowLeft} size="lg" onClick={goBack}>
            Go back
          </Button>
          <Link to={home}>
            <Button variant="primary" icon={Home} size="lg">{homeLabel}</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
