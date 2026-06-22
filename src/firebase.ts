import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase Client
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure Google Auth provider with requested Tasks & Keep scopes
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('https://www.googleapis.com/auth/tasks');
googleAuthProvider.addScope('https://www.googleapis.com/auth/tasks.readonly');

// Attempt to add Google Keep scopes. We catch and report scope availability since
// Keep API permissions require exclusive enterprise-only organization setup from Google.
try {
  googleAuthProvider.addScope('https://www.googleapis.com/auth/keep');
  googleAuthProvider.addScope('https://www.googleapis.com/auth/keep.readonly');
} catch (scopeErr) {
  console.warn('Keep scopes registration skipped:', scopeErr);
}

// Caching the access token in memory
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Listen to authentication state shifts
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Clear cached token if not signing in
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign-in pop-up handler
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleAuthProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth credential');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Get the active access token
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Sign-out helper
export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
