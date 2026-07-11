import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wordmark } from '../../components/layout/Logo.jsx';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-canvas text-ink relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />

      <header className="relative z-10 px-6 lg:px-10 py-6 flex items-center justify-between">
        <Link to="/">
          <Wordmark size={17} />
        </Link>
        <div className="text-[12.5px] text-mute">Epidemic Intelligence Platform</div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <Outlet />
        </motion.div>
      </main>

      <footer className="relative z-10 px-6 lg:px-10 py-6 text-[12px] text-faint flex items-center justify-between border-t border-line">
        <div>© {new Date().getFullYear()} EpiCast</div>
        <div className="flex items-center gap-5">
          <a className="hover:text-mute transition" href="#">Privacy</a>
          <a className="hover:text-mute transition" href="#">Terms</a>
        </div>
      </footer>
    </div>
  );
}
