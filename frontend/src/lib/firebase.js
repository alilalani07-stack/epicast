/**
 * Firebase initialization.
 *
 * All configuration is read from environment variables (Vite picks up any
 * variable prefixed with `VITE_`).  See `.env.example` for the full list.
 *
 * NOTE: Firebase web API keys are not "secrets" in the traditional sense —
 * they identify the project, not authorize access. Access is enforced by
 * Firebase Security Rules. Still, keep them out of source control.
 *
 * If the required environment variables are missing the app continues to
 * run in "demo auth" mode (see `services/auth.service.js`) so it remains
 * fully demoable without a real Firebase project.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

/** True when every required Firebase env var is present. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

/**
 * Lazily initialize Firebase. When the env is unconfigured we still create
 * a dummy app so `getAuth()` does not throw — but `auth.service.js`
 * inspects `isFirebaseConfigured` and routes around real Firebase calls.
 */
function createApp() {
  if (getApps().length) return getApp();
  if (isFirebaseConfigured) return initializeApp(firebaseConfig);
  // Minimal placeholder so getAuth() can be called without throwing.
  return initializeApp({
    apiKey: 'demo-key',
    authDomain: 'demo.firebaseapp.com',
    projectId: 'demo',
    appId: '1:0:web:demo',
  });
}

export const firebaseApp = createApp();
export const firebaseAuth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

if (isFirebaseConfigured) {
  // Persist sessions across reloads/tabs.
  setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {
    /* non-fatal */
  });
}

export default firebaseApp;
