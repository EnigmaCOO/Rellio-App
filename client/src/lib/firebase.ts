/**
 * Firebase configuration and auth providers.
 *
 * Gracefully disabled when VITE_FIREBASE_API_KEY is not set.
 * The rest of the app works via the existing backend session auth
 * when Firebase is not configured.
 *
 * Required env vars (prefix with VITE_ for Vite to expose to frontend):
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_APP_ID
 *
 * Optional for analytics:
 *   VITE_FIREBASE_MEASUREMENT_ID
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  type Auth,
} from "firebase/auth";

/**
 * Returns the list of required `VITE_FIREBASE_*` env vars that are not
 * set. Used to surface a precise actionable error to the user when they
 * attempt social sign-in on an environment that hasn't been wired up.
 */
export function firebaseMissingVars(): string[] {
  const missing: string[] = [];
  if (!import.meta.env.VITE_FIREBASE_API_KEY) missing.push("VITE_FIREBASE_API_KEY");
  if (!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) missing.push("VITE_FIREBASE_AUTH_DOMAIN");
  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) missing.push("VITE_FIREBASE_PROJECT_ID");
  if (!import.meta.env.VITE_FIREBASE_APP_ID) missing.push("VITE_FIREBASE_APP_ID");
  return missing;
}

export const firebaseConfigured = firebaseMissingVars().length === 0;

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _googleProvider: GoogleAuthProvider | null = null;
let _appleProvider: OAuthProvider | null = null;

if (firebaseConfigured) {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  _app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
  _auth = getAuth(_app);

  _googleProvider = new GoogleAuthProvider();
  _googleProvider.addScope("profile");
  _googleProvider.addScope("email");

  // Apple sign-in structure — gated behind VITE_FIREBASE_APPLE_ENABLED
  // Requires Apple Developer Program membership + Service ID configured in Firebase console
  if (import.meta.env.VITE_FIREBASE_APPLE_ENABLED === "true") {
    _appleProvider = new OAuthProvider("apple.com");
    _appleProvider.addScope("email");
    _appleProvider.addScope("name");
  }
}

export const firebaseAuth = _auth;
export const googleProvider = _googleProvider;
export const appleProvider = _appleProvider;
