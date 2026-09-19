import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut,
  Auth
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// In-memory token cache (strictly NO localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Lazy safe instance references
let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export const getFirebaseAuth = (): Auth | null => {
  if (authInstance) return authInstance;
  try {
    if (!appInstance) {
      appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    }
    if (appInstance) {
      authInstance = getAuth(appInstance);
    }
    return authInstance;
  } catch (err) {
    console.warn('Firebase Auth deferred or restricted in current iframe sandbox:', err);
    return null;
  }
};

export const getGoogleProvider = (): GoogleAuthProvider => {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar');
  provider.addScope('https://www.googleapis.com/auth/calendar.events');
  provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return provider;
};

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  const auth = getFirebaseAuth();
  if (!auth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }

  try {
    return onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        if (cachedAccessToken) {
          if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        } else if (!isSigningIn) {
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
        }
      } else {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    });
  } catch (err) {
    console.warn('Auth state subscription failed:', err);
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Google Calendar synchronization is unavailable in the current preview environment.');
  }

  try {
    isSigningIn = true;
    const provider = getGoogleProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token from authentication response.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Get active in-memory cached token
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Logout and purge cached credentials
export const googleLogout = async () => {
  const auth = getFirebaseAuth();
  if (auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  }
  cachedAccessToken = null;
};

