import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

interface FirebaseConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly storageBucket: string;
  readonly messagingSenderId: string;
  readonly appId: string;
}

function readEnv(name: string): string {
  const value = import.meta.env[name];
  return typeof value === 'string' ? value : '';
}

function buildFirebaseConfig(): FirebaseConfig {
  const config: FirebaseConfig = {
    apiKey: readEnv('VITE_FIREBASE_API_KEY'),
    authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readEnv('VITE_FIREBASE_APP_ID'),
  };
  const missing = (Object.entries(config) as [keyof FirebaseConfig, string][])
    .filter(([, v]) => v.length === 0)
    .map(([k]) => `VITE_FIREBASE_${k.replace(/[A-Z]/g, m => '_' + m).toUpperCase().replace(/^_/, '')}`);

  if (missing.length > 0) {
    const message = `Firebase config missing required env vars: ${missing.join(', ')}. Auth and Firestore will not work.`;
    if (import.meta.env.PROD) {
      throw new Error(message);
    }
    console.warn(message);
  }
  return config;
}

const firebaseConfig = buildFirebaseConfig();

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
