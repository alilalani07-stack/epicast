import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService, { ROLES } from '../services/auth.service.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Seed state synchronously from the current Firebase user.
  // This is instant (no network call) and means StrictMode remounts never
  // reset an already-authenticated session back to ready=false.
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [ready, setReady] = useState(() => {
    // If Firebase already has a current user we can skip the async wait.
    return authService.getCurrentUser() !== null;
  });
  const navigate = useNavigate();

  // Subscribe to auth state once.
  // Still needed to: pick up sign-outs from other tabs, refresh tokens,
  // and handle the initial load when currentUser is null until Firebase
  // finishes its own async initialization check.
  useEffect(() => {
    let mounted = true;

    // Fail-safe timeout in case Firebase hangs
    const timer = setTimeout(() => {
      if (mounted) setReady(true);
    }, 4000);

    const unsub = authService.subscribe((u) => {
      if (!mounted) return;
      setUser(u);
      setReady(true);
      clearTimeout(timer);
    });
    return () => {
      mounted = false;
      clearTimeout(timer);
      unsub && unsub();
    };
  }, []);

  const signIn = useCallback(async (creds) => {
    const u = await authService.signIn(creds);
    setUser(u);
    // A successful manual sign-in is proof auth has resolved — don't leave
    // `ready` waiting on the mount-time subscribe callback, which can still
    // be in flight and could otherwise briefly report a stale state.
    setReady(true);
    return u;
  }, []);

  const register = useCallback(async (data) => {
    const u = await authService.register(data);
    setUser(u);
    setReady(true); // same reasoning as signIn
    return u;
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      ready,
      isAuthenticated: !!user,
      role: user?.role || null,
      isAuthority: user?.role === ROLES.AUTHORITY,
      isClinic: user?.role === ROLES.CLINIC,
      signIn,
      register,
      signOut,
    }),
    [user, ready, signIn, register, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}