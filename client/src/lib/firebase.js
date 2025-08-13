// Lightweight Firebase client init. Controlled via REACT_APP_FIREBASE_ENABLED.

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
// Returns a GoogleAuthProvider instance for Google sign-in
export function getGoogleProvider() {
  if (process.env.REACT_APP_FIREBASE_ENABLED !== 'true') return null;
  return new firebase.auth.GoogleAuthProvider();
}

let initialized = false;

export function getFirebaseAuth() {
  if (process.env.REACT_APP_FIREBASE_ENABLED !== 'true') return null;
  
  if (!initialized) {
    const cfg = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID,
    };
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(cfg);
      }
      initialized = true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Firebase init failed or already initialized:', e?.message || e);
    }
  }
  return firebase.auth();
}

export default getFirebaseAuth;
