import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { ROLES } from '../../services/auth.service.js';
import BootSplash from './BootSplash.jsx';

/**
 * Inverse of ProtectedRoute.
 *
 * Renders its children only when the user is NOT signed in.
 * When the user IS already signed in, redirects them to their portal home
 * (using `replace` so the login/register page does not pollute history).
 *
 * Honors `location.state.from` if the user was originally bounced from
 * a protected route — they land where they intended.
 */
export default function PublicOnlyRoute({ children }) {
  const { ready, isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!ready) return <BootSplash />;

  if (isAuthenticated) {
    const fallback = role === ROLES.AUTHORITY ? '/authority/dashboard' : '/clinic/dashboard';
    const to = location.state?.from?.pathname || fallback;
    return <Navigate to={to} replace />;
  }

  return children;
}
