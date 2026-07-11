import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { ROLES } from '../../services/auth.service.js';
import BootSplash from './BootSplash.jsx';

/**
 * Guards a subtree.
 *
 * Props:
 *   role   — "authority" | "clinic" (optional)  Only allow this role.
 *   redirectTo — where to send unauthenticated users (default /login)
 *
 * Behavior:
 *   • While auth is initializing → renders <BootSplash />.
 *   • Not authenticated → redirect to /login?role=<role>, preserving `from`.
 *   • Wrong role → redirect to that user's home portal.
 */
export default function ProtectedRoute({ role, redirectTo = '/login', children }) {
  const { ready, isAuthenticated, role: userRole } = useAuth();
  const location = useLocation();

  if (!ready) return <BootSplash />;

  if (!isAuthenticated) {
    const qs = role ? `?role=${role}` : '';
    return <Navigate to={`${redirectTo}${qs}`} replace state={{ from: location }} />;
  }

  if (role && userRole && userRole !== role) {
    const home = userRole === ROLES.AUTHORITY ? '/authority/dashboard' : '/clinic/dashboard';
    return <Navigate to={home} replace />;
  }

  return children;
}
