import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore, doc, getDocFromServer } from "firebase/firestore";
import appletConfig from "../../firebase-applet-config.json";

// Verified project configuration fallback for PHY64ALL
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "api",
  authDomain: "authdomain",
  projectId: "id",
  storageBucket: "bucket",
  messagingSenderId: "msgid",
  appId: "appid",
  firestoreDatabaseId: "dbid",
};

// Window injection (populated dynamically by server.ts in production)
const runtimeWindowConfig =
  typeof window !== "undefined" ? (window as any).__FIREBASE_CONFIG__ : null;

// Validate that candidate API key is a valid non-empty string
function resolveValidApiKey(): string {
  const candidates = [
    runtimeWindowConfig?.apiKey,
    import.meta.env.VITE_FIREBASE_API_KEY,
    (appletConfig as any)?.apiKey,
    DEFAULT_FIREBASE_CONFIG.apiKey,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      candidate.trim().length > 15 &&
      !candidate.includes("YOUR_") &&
      !candidate.includes("undefined")
    ) {
      return candidate.trim();
    }
  }
  return DEFAULT_FIREBASE_CONFIG.apiKey;
}

// Read configuration with precedence:
// 1. Runtime window injection (Cloud Run environment variables via server.ts)
// 2. Vite build-time environment variables
// 3. firebase-applet-config.json
// 4. DEFAULT_FIREBASE_CONFIG constant
const firebaseConfig = {
  apiKey: resolveValidApiKey(),
  authDomain:
    runtimeWindowConfig?.authDomain ||
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    (appletConfig as any)?.authDomain ||
    DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId:
    runtimeWindowConfig?.projectId ||
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    (appletConfig as any)?.projectId ||
    DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket:
    runtimeWindowConfig?.storageBucket ||
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    (appletConfig as any)?.storageBucket ||
    DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId:
    runtimeWindowConfig?.messagingSenderId ||
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    (appletConfig as any)?.messagingSenderId ||
    DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId:
    runtimeWindowConfig?.appId ||
    import.meta.env.VITE_FIREBASE_APP_ID ||
    (appletConfig as any)?.appId ||
    DEFAULT_FIREBASE_CONFIG.appId,
};

const firestoreDbId =
  runtimeWindowConfig?.firestoreDatabaseId ||
  import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
  (appletConfig as any)?.firestoreDatabaseId ||
  DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId;

// Initialize Firebase App singleton
export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth: Auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Initialize Firestore (supporting named database instance or default database)
let firestoreInstance: Firestore;
try {
  if (firestoreDbId && firestoreDbId !== "(default)") {
    firestoreInstance = getFirestore(app, firestoreDbId);
  } else {
    firestoreInstance = getFirestore(app);
  }
} catch {
  firestoreInstance = getFirestore(app);
}

export const db: Firestore = firestoreInstance;

// Validate connection on startup
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error: any) {
    if (error?.message?.includes("the client is offline")) {
      console.warn("[Firebase] Client is offline or database is unreachable.");
      return false;
    }
    return true;
  }
}

if (typeof window !== "undefined") {
  validateFirestoreConnection();
}
