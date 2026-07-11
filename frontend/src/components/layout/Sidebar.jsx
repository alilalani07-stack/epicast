import { NavLink, Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { Wordmark } from './Logo.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'EC';
}

function NavItem({ item, onClick }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      end
      className={({ isActive }) =>
        clsx(
          'group relative flex items-center gap-3 px-3.5 h-10 rounded-lg text-[14px] font-medium transition-all',
          isActive
            ? 'bg-surface text-ink shadow-soft border border-line'
            : 'text-mute hover:text-ink hover:bg-surface/60 border border-transparent'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={clsx('w-4 h-4 shrink-0', isActive ? 'text-ink' : 'text-mute')} strokeWidth={1.75} />
          <span className="truncate flex-1">{item.label}</span>
          {item.badge && (
            <span className="text-[10.5px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-ink text-white">
              {item.badge}
            </span>
          )}
          {isActive && <ChevronRight className="w-3.5 h-3.5 text-ink" />}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ groups, portalLabel, onItemClick }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    // `replace` so Back from the landing page does not return to the dashboard.
    navigate('/', { replace: true });
  };

  const displayName = user?.displayName || user?.email || 'User';
  const roleLabel = portalLabel === 'Authority' ? 'Health Authority' : 'Clinic Lead';

  return (
    <div className="h-full flex flex-col">
      <div className="h-16 px-5 flex items-center border-b border-line">
        <Link to="/" className="flex items-center">
          <Wordmark size={17} />
        </Link>
      </div>

      <div className="px-4 pt-5">
        <div className="px-1 pb-2">
          <span className="eyebrow text-[11px]">{portalLabel} Portal</span>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-6 overflow-y-auto pb-4">
        {groups.map((group) => (
          <div key={group.section}>
            <div className="px-3.5 pt-1 pb-2 text-[11.5px] font-medium uppercase tracking-[0.12em] text-faint">
              {group.section}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.to} item={item} onClick={onItemClick} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-line space-y-2">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-surface-2 border border-line">
          <div className="w-10 h-10 rounded-lg bg-ink text-white flex items-center justify-center text-[13px] font-semibold">
            {initials(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-medium text-ink truncate">{displayName}</div>
            <div className="text-[12px] text-mute truncate">{roleLabel}</div>
          </div>
          <span className="relative flex w-2 h-2" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-emerald-500 ping-ring" />
            <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
          </span>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full inline-flex items-center justify-center gap-2 h-10 px-3 rounded-lg text-[13.5px] font-medium text-mute hover:text-ink hover:bg-surface-2 border border-transparent hover:border-line transition-all"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ groups, portalLabel, mobileOpen, onMobileClose }) {
  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[272px] z-30 bg-canvas border-r border-line">
        <SidebarContent groups={groups} portalLabel={portalLabel} />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 left-0 w-[284px] bg-canvas border-r border-line flex flex-col"
            >
              <button
                onClick={onMobileClose}
                className="absolute top-4 right-4 w-9 h-9 rounded-md flex items-center justify-center text-mute hover:text-ink hover:bg-surface-2 z-10"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent groups={groups} portalLabel={portalLabel} onItemClick={onMobileClose} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
