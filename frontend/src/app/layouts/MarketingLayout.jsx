import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Wordmark } from '../../components/layout/Logo.jsx';
import Button from '../../components/ui/Button.jsx';
import GetStartedModal from '../../components/marketing/GetStartedModal.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { ROLES } from '../../services/auth.service.js';

const NAV = [
  { label: 'Platform', href: '#platform' },
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Preview', href: '#preview' },
];

export default function MarketingLayout() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [getStartedOpen, setGetStartedOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const goToPortal = () => {
    const dest = role === ROLES.AUTHORITY ? '/authority/dashboard' : '/clinic/dashboard';
    navigate(dest);
  };

  const primaryAction = isAuthenticated
    ? { label: 'Open dashboard', onClick: goToPortal, iconRight: ArrowRight }
    : { label: 'Get started', onClick: () => setGetStartedOpen(true) };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <motion.header
        initial={false}
        animate={{ paddingTop: scrolled ? 10 : 18, paddingBottom: scrolled ? 10 : 18 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 inset-x-0 z-50 transition-colors ${
          scrolled ? 'glass-strong border-b border-line' : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1320px] mx-auto px-6 lg:px-10 flex items-center gap-8">
          <Link to="/" className="shrink-0">
            <Wordmark size={18} />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-[13.5px] text-mute hover:text-ink transition-colors"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex-1" />

          <div className="hidden md:flex items-center">
            <Button
              variant="primary"
              size="md"
              iconRight={primaryAction.iconRight}
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
          </div>

          <button
            className="md:hidden w-10 h-10 rounded-md flex items-center justify-center hover:bg-surface-2 transition"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-line bg-surface"
          >
            <div className="px-6 py-5 flex flex-col gap-2">
              {NAV.map((n) => (
                <a key={n.href} href={n.href} className="py-2.5 text-[14px] text-ink-2">
                  {n.label}
                </a>
              ))}
              <Button
                variant="primary"
                size="lg"
                className="w-full mt-3"
                onClick={() => { setMobileOpen(false); primaryAction.onClick(); }}
              >
                {primaryAction.label}
              </Button>
            </div>
          </motion.div>
        )}
      </motion.header>

      <main className="pt-[80px]">
        <Outlet
          context={{
            openGetStarted: isAuthenticated ? goToPortal : () => setGetStartedOpen(true),
            primaryLabel: primaryAction.label,
          }}
        />
      </main>

      <MarketingFooter />

      <GetStartedModal open={getStartedOpen} onClose={() => setGetStartedOpen(false)} />
    </div>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 py-14">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <Wordmark size={18} />
            <p className="mt-3 text-[13px] text-mute max-w-sm">
              Epidemic intelligence and forecasting for modern health authorities and clinics.
            </p>
          </div>
          <div className="flex items-center gap-7 text-[13px] text-ink-2">
            <a href="#" className="hover:text-ink transition-colors">Privacy</a>
            <a href="#" className="hover:text-ink transition-colors">Terms</a>
            <a href="#" className="hover:text-ink transition-colors">Security</a>
            <a href="#" className="hover:text-ink transition-colors">Contact</a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-line flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="text-[12px] text-faint">
            © {new Date().getFullYear()} EpiCast Health Intelligence
          </div>
          <div className="inline-flex items-center gap-1.5 text-[12px] text-faint">
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-emerald-500 ping-ring" />
              <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
