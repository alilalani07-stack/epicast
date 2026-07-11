/**
 * Auth service.
 *
 * Wraps Firebase Auth so the rest of the app talks to one stable API.
 * When Firebase is not configured (demo mode), falls back to a local
 * credential check so the UI is fully demoable. Roles are tracked in
 * localStorage in both modes (since Firebase does not store roles natively).
 *
 * Backend integration:
 *   • Frontend calls `getIdToken()` to attach the Firebase ID token to
 *     outgoing API requests (see services/api.js interceptor).
 *   • The backend is the source of truth for permissions.
 */
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { firebaseAuth, isFirebaseConfigured, db } from '../lib/firebase.js';
import api, { unwrap } from './api.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const ROLE_KEY = 'epicast_role';
const DEMO_USER_KEY = 'epicast_demo_user';
const TOKEN_KEY = 'epicast_token';

/* ─── Role storage (works for both real Firebase users and demo users) ─── */
export const ROLES = { AUTHORITY: 'authority', CLINIC: 'clinic' };

export async function getFirestoreRole(uid) {
  if (!isFirebaseConfigured) return null;
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().role || null;
    }
  } catch (err) {
    console.error('Error fetching Firestore role:', err);
  }
  return null;
}

export async function claimFirestoreRole(uid, role, email) {
  if (!isFirebaseConfigured) return;
  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, {
      role,
      email,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Error claiming Firestore role:', err);
    throw err;
  }
}

export function getRoleFromToken(token) {
  if (!token) return null;
  if (token.startsWith('demo.')) {
    const parts = token.split('.');
    if (parts.length >= 3) {
      return parts[1];
    }
    return null;
  }
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.role || null;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getStoredRole() {
  const token = localStorage.getItem(TOKEN_KEY);
  const roleFromToken = getRoleFromToken(token);
  if (roleFromToken) return roleFromToken;
  const r = localStorage.getItem(ROLE_KEY);
  return r === ROLES.AUTHORITY || r === ROLES.CLINIC ? r : null;
}
function setStoredRole(role) {
  if (role) localStorage.setItem(ROLE_KEY, role);
}
function clearStoredRole() {
  localStorage.removeItem(ROLE_KEY);
}

/* ─── Demo-mode helpers ───────────────────────────────────────────── */
function readDemoUser() {
  try {
    const raw = localStorage.getItem(DEMO_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeDemoUser(u) {
  if (u) localStorage.setItem(DEMO_USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(DEMO_USER_KEY);
}

/* ─── Normalized user shape consumed by AuthContext ───────────────── */
function normalize(fbUser, role) {
  if (!fbUser) return null;
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
    photoURL: fbUser.photoURL || null,
    role: role || getRoleFromToken(localStorage.getItem(TOKEN_KEY)) || ROLES.AUTHORITY,
  };
}

/* ─── Public API ───────────────────────────────────────────────────── */

export async function signIn({ email, password, role }) {
  if (!email || !password) throw new Error('Email and password are required.');

  if (!isFirebaseConfigured) {
    // Demo mode: any non-empty credential is accepted.
    if (role) setStoredRole(role);
    const user = {
      uid: `demo-${btoa(email).slice(0, 10)}`,
      email,
      displayName: email.split('@')[0],
      photoURL: null,
    };
    writeDemoUser(user);
    localStorage.setItem(TOKEN_KEY, `demo.${role || 'authority'}.${user.uid}`);
    return normalize(user, role);
  }

  try {
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    let token = await cred.user.getIdToken();
    localStorage.setItem(TOKEN_KEY, token);

    // Read users/{uid} from Firestore.
    let verifiedRole = await getFirestoreRole(cred.user.uid);

    if (!verifiedRole) {
      // If no Firestore document exists, create one using the selected tab's role (migration support).
      const roleToClaim = role || ROLES.AUTHORITY;
      await claimFirestoreRole(cred.user.uid, roleToClaim, email);
      
      // Also ensure backend custom claims are set
      try {
        await api.post('/auth/claim-role', { role: roleToClaim }).then(unwrap);
      } catch (claimErr) {
        console.warn('Backend role claim failed during migration:', claimErr);
      }
      
      // Force refresh the token to get the new claim.
      token = await cred.user.getIdToken(true);
      localStorage.setItem(TOKEN_KEY, token);
      verifiedRole = roleToClaim;
    }

    return normalize(cred.user, verifiedRole);
  } catch (err) {
    throw new Error(prettifyFirebaseError(err));
  }
}

export async function register({ email, password, displayName, role }) {
  if (!email || !password) throw new Error('Email and password are required.');

  if (!isFirebaseConfigured) {
    if (role) setStoredRole(role);
    const user = {
      uid: `demo-${btoa(email).slice(0, 10)}`,
      email,
      displayName: displayName || email.split('@')[0],
      photoURL: null,
    };
    writeDemoUser(user);
    localStorage.setItem(TOKEN_KEY, `demo.${role || 'authority'}.${user.uid}`);
    return normalize(user, role);
  }

  try {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    if (displayName) await updateProfile(cred.user, { displayName });

    let token = await cred.user.getIdToken();
    localStorage.setItem(TOKEN_KEY, token);

    // Save to Firestore users/{uid} document: { role, email, createdAt: serverTimestamp() }
    const roleToClaim = role || ROLES.AUTHORITY;
    await claimFirestoreRole(cred.user.uid, roleToClaim, email);

    // Call POST /auth/claim-role to bind the selected role.
    await api.post('/auth/claim-role', { role: roleToClaim }).then(unwrap);

    // Force refresh token to bake custom claims in.
    token = await cred.user.getIdToken(true);
    localStorage.setItem(TOKEN_KEY, token);

    return normalize(cred.user, roleToClaim);
  } catch (err) {
    throw new Error(prettifyFirebaseError(err));
  }
}

export async function signOut() {
  localStorage.removeItem(TOKEN_KEY);
  clearStoredRole();
  if (!isFirebaseConfigured) {
    writeDemoUser(null);
    return;
  }
  try { await fbSignOut(firebaseAuth); } catch { /* swallow */ }
}

export async function resetPassword(email) {
  if (!email) throw new Error('Please enter your email to reset password.');
  if (!isFirebaseConfigured) {
    return; // mock success in demo mode
  }
  try {
    await sendPasswordResetEmail(firebaseAuth, email);
  } catch (err) {
    throw new Error(prettifyFirebaseError(err));
  }
}

/**
 * Subscribe to auth state. Returns an unsubscribe fn.
 * Calls back with a normalized user object (or null).
 */
export function subscribe(cb) {
  if (!isFirebaseConfigured) {
    // Demo: synchronously emit, no live listener.
    const user = readDemoUser();
    queueMicrotask(() => cb(normalize(user, getStoredRole())));
    return () => {};
  }
  return onAuthStateChanged(firebaseAuth, async (fbUser) => {
    if (!fbUser) return cb(null);
    let verifiedRole = null;
    try {
      const token = await fbUser.getIdToken();
      localStorage.setItem(TOKEN_KEY, token);
      verifiedRole = await getFirestoreRole(fbUser.uid);
    } catch (err) {
      console.error('onAuthStateChanged role check failed:', err);
    }
    cb(normalize(fbUser, verifiedRole));
  });
}

/**
 * Synchronously return the currently-signed-in normalized user, or null.
 * Reads firebaseAuth.currentUser (set by Firebase on init) so this is
 * instant — no network round-trip, no async await required.
 * Used by AuthContext to seed initial state before the async subscriber fires.
 */
export function getCurrentUser() {
  if (!isFirebaseConfigured) {
    const demo = readDemoUser();
    return demo ? normalize(demo, getStoredRole()) : null;
  }
  const fbUser = firebaseAuth.currentUser;
  return fbUser ? normalize(fbUser, getStoredRole()) : null;
}

/** Get a fresh ID token (or null). Used by Axios request interceptor. */
export async function getIdToken() {
  if (!isFirebaseConfigured) return localStorage.getItem(TOKEN_KEY);
  const user = firebaseAuth.currentUser;
  if (!user) return localStorage.getItem(TOKEN_KEY);
  try {
    const token = await user.getIdToken();
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch {
    return localStorage.getItem(TOKEN_KEY);
  }
}

/* ─── Error humanizer ─────────────────────────────────────────────── */
function prettifyFirebaseError(err) {
  const code = err?.code || '';
  const map = {
    'auth/invalid-email': 'That email address is invalid.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/email-already-in-use': 'An account with that email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
    'auth/network-request-failed': 'Network error. Check your connection and retry.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled.',
  };
  return map[code] || err?.message || 'Authentication failed.';
}

export default {
  ROLES,
  signIn,
  register,
  signOut,
  subscribe,
  getCurrentUser,
  getIdToken,
  getStoredRole,
  resetPassword,
  getFirestoreRole,
  claimFirestoreRole,
};
