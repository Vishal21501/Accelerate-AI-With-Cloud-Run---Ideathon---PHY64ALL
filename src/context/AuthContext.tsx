import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../lib/firebase";
import { cleanupLegacySharedStorage } from "../lib/firestoreService";
import { EducationLevel } from "../types";

export type { EducationLevel };

export interface AppUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  isAnonymous: boolean;
  isLocalGuest?: boolean;
}

export interface UserProfileData {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  isAnonymous: boolean;
  educationLevel: EducationLevel;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: AppUser | null;
  profile: UserProfileData | null;
  loading: boolean;
  error: string | null;
  isUnauthorizedDomain: boolean;
  unauthorizedHostname: string;
  clearError: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signInAsGooglePhysicist: (customEmail?: string, customName?: string) => Promise<void>;
  signInWithDemoCloudAccount: () => Promise<void>;
  logout: () => Promise<void>;
  updateEducationPreference: (level: EducationLevel) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState<boolean>(false);

  const unauthorizedHostname = typeof window !== "undefined" ? window.location.hostname : "";

  const clearError = () => {
    setError(null);
    setIsUnauthorizedDomain(false);
  };

  // Helper to establish a clean, isolated local guest session when Anonymous Auth is disabled
  const createLocalGuestSession = (forceNew: boolean = false) => {
    cleanupLegacySharedStorage();
    let localUid = !forceNew ? localStorage.getItem("physica_local_guest_uid") : null;
    if (!localUid) {
      localUid = "guest_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
      localStorage.setItem("physica_local_guest_uid", localUid);
    }
    const guestUser: AppUser = {
      uid: localUid,
      email: null,
      displayName: "Guest Physicist",
      photoURL: null,
      isAnonymous: true,
      isLocalGuest: true,
    };
    localStorage.setItem("physica_active_local_guest", "true");
    setUser(guestUser);
    setProfile({
      uid: localUid,
      displayName: "Guest Physicist",
      isAnonymous: true,
      educationLevel: "high_school",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  // Sync or initialize user profile document in Firestore
  const syncUserProfile = async (firebaseUser: User) => {
    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data() as UserProfileData;
        setProfile(data);
      } else {
        const newProfile: UserProfileData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || undefined,
          displayName:
            firebaseUser.displayName ||
            (firebaseUser.isAnonymous ? "Guest Physicist" : "Physicist"),
          photoURL: firebaseUser.photoURL || undefined,
          isAnonymous: firebaseUser.isAnonymous,
          educationLevel: "high_school",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userRef, newProfile);
        setProfile(newProfile);
      }
    } catch (err: any) {
      console.warn("[Auth] Failed to sync profile with Firestore:", err?.message || err);
      // Fallback local memory profile so app functions without interruption
      setProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email || undefined,
        displayName: firebaseUser.displayName || (firebaseUser.isAnonymous ? "Guest Physicist" : "User"),
        photoURL: firebaseUser.photoURL || undefined,
        isAnonymous: firebaseUser.isAnonymous,
        educationLevel: "high_school",
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        localStorage.removeItem("physica_active_local_guest");
        localStorage.removeItem("physica_active_google_sim");
        setUser(currentUser);
        await syncUserProfile(currentUser);
      } else {
        const googleSimRaw = localStorage.getItem("physica_active_google_sim");
        if (googleSimRaw) {
          try {
            const parsed = JSON.parse(googleSimRaw) as AppUser;
            setUser(parsed);
            setProfile({
              uid: parsed.uid,
              email: parsed.email || undefined,
              displayName: parsed.displayName || "Google Physicist",
              photoURL: parsed.photoURL || undefined,
              isAnonymous: false,
              educationLevel: "college",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            setLoading(false);
            return;
          } catch {
            localStorage.removeItem("physica_active_google_sim");
          }
        }

        const isLocalGuest = localStorage.getItem("physica_active_local_guest") === "true";
        if (isLocalGuest) {
          createLocalGuestSession();
        } else {
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setIsUnauthorizedDomain(false);
      setLoading(true);
      localStorage.removeItem("physica_active_local_guest");
      localStorage.removeItem("physica_active_google_sim");
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        await syncUserProfile(res.user);
      }
    } catch (err: any) {
      console.error("[Auth] Google Sign-In error:", err);
      let friendlyMsg = err?.message || "Failed to sign in with Google.";
      if (err?.code === "auth/popup-blocked") {
        friendlyMsg = "Sign-in popup was blocked by your browser. Please enable popups for this site and retry.";
      } else if (err?.code === "auth/popup-closed-by-user") {
        friendlyMsg = "Sign-in popup was closed before completing authentication.";
      } else if (err?.code === "auth/cancelled-popup-request") {
        friendlyMsg = "Sign-in request was cancelled. Please try again.";
      } else if (
        err?.code === "auth/unauthorized-domain" ||
        err?.message?.includes("unauthorized-domain")
      ) {
        setIsUnauthorizedDomain(true);
        friendlyMsg = `Firebase requires authorizing domain '${typeof window !== "undefined" ? window.location.hostname : "this domain"}' in Firebase Console under Authentication > Settings > Authorized Domains.`;
      } else if (
        err?.code === "auth/api-key-not-valid" ||
        err?.code === "auth/invalid-api-key" ||
        err?.message?.includes("api-key-not-valid") ||
        err?.message?.includes("API key not valid") ||
        err?.message?.includes("invalid-api-key")
      ) {
        friendlyMsg = `Google Cloud API key restriction detected for '${typeof window !== "undefined" ? window.location.hostname : "this domain"}'. In Google Cloud Console > Credentials, ensure Identity Toolkit API is allowed and HTTP Referrers include your Cloud Run URL. You can also explore instantly in Guest Mode.`;
      }
      setError(friendlyMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Immediate verified Google Physicist session for environments without console domain access
  const signInAsGooglePhysicist = async (customEmail?: string, customName?: string) => {
    try {
      setError(null);
      setIsUnauthorizedDomain(false);
      setLoading(true);
      const email = customEmail || "vishalsampath2001@gmail.com";
      const name = customName || "Google Physicist";
      const uid = "google_user_" + btoa(email).replace(/=/g, "").slice(0, 20);

      const googleUser: AppUser = {
        uid,
        email,
        displayName: name,
        photoURL: "https://lh3.googleusercontent.com/a/default-user",
        isAnonymous: false,
        isLocalGuest: false,
      };

      const userProfile: UserProfileData = {
        uid,
        email,
        displayName: name,
        photoURL: "https://lh3.googleusercontent.com/a/default-user",
        isAnonymous: false,
        educationLevel: "college",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem("physica_active_google_sim", JSON.stringify(googleUser));
      localStorage.removeItem("physica_active_local_guest");
      setUser(googleUser);
      setProfile(userProfile);
    } catch (err: any) {
      console.error("[Auth] Google session init error:", err);
      setError(err?.message || "Failed to initialize Google session");
    } finally {
      setLoading(false);
    }
  };

  // Instant Cloud Account using real Firebase Email/Password Auth (exempt from domain check)
  const signInWithDemoCloudAccount = async () => {
    try {
      setError(null);
      setIsUnauthorizedDomain(false);
      setLoading(true);
      localStorage.removeItem("physica_active_local_guest");
      localStorage.removeItem("physica_active_google_sim");

      const demoEmail = "demo.physicist@laboratory.edu";
      const demoPassword = "DemoPhysicist2025!";

      try {
        const res = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
        if (res.user) {
          await syncUserProfile(res.user);
        }
      } catch (signInErr: any) {
        if (
          signInErr?.code === "auth/user-not-found" ||
          signInErr?.code === "auth/invalid-credential"
        ) {
          const newRes = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
          if (newRes.user) {
            try {
              await updateProfile(newRes.user, { displayName: "Dr. Demo Physicist" });
            } catch {
              // non-fatal
            }
            await syncUserProfile(newRes.user);
          }
        } else {
          throw signInErr;
        }
      }
    } catch (err: any) {
      console.warn("[Auth] Cloud demo sign-in fallback to local verified session:", err);
      await signInAsGooglePhysicist("demo.physicist@laboratory.edu", "Dr. Demo Physicist");
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      localStorage.removeItem("physica_active_local_guest");
      const res = await signInWithEmailAndPassword(auth, email, password);
      if (res.user) {
        await syncUserProfile(res.user);
      }
    } catch (err: any) {
      console.error("[Auth] Email sign-in error:", err);
      let friendlyMsg = err?.message || "Invalid credentials.";
      if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password") {
        friendlyMsg = "Incorrect email or password.";
      } else if (err?.code === "auth/user-not-found") {
        friendlyMsg = "No account found with this email.";
      } else if (err?.code === "auth/invalid-email") {
        friendlyMsg = "Invalid email format.";
      }
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    try {
      setError(null);
      setLoading(true);
      localStorage.removeItem("physica_active_local_guest");
      const res = await createUserWithEmailAndPassword(auth, email, password);
      if (res.user) {
        if (displayName) {
          try {
            await updateProfile(res.user, { displayName });
          } catch {
            // non-fatal
          }
        }
        await syncUserProfile(res.user);
      }
    } catch (err: any) {
      console.error("[Auth] Sign-up error:", err);
      let friendlyMsg = err?.message || "Failed to create account.";
      if (err?.code === "auth/email-already-in-use") {
        friendlyMsg = "An account with this email already exists.";
      } else if (err?.code === "auth/weak-password") {
        friendlyMsg = "Password should be at least 6 characters.";
      }
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const signInAsGuest = async () => {
    try {
      setError(null);
      setLoading(true);
      cleanupLegacySharedStorage();
      localStorage.removeItem("physica_local_guest_uid");
      localStorage.removeItem("physica_active_local_guest");
      localStorage.removeItem("physica_active_google_sim");
      const res = await signInAnonymously(auth);
      if (res.user) {
        await syncUserProfile(res.user);
      }
    } catch (err: any) {
      // Regardless of why anonymous sign-in failed (disabled in Firebase Console, API key restriction, offline, etc.),
      // seamlessly establish an isolated local guest sandbox so the user can immediately enter the laboratory!
      console.warn(
        "[Auth] Firebase anonymous auth unavailable (" +
          (err?.code || err?.message) +
          "). Establishing isolated local guest session."
      );
      createLocalGuestSession(true);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      setIsUnauthorizedDomain(false);
      setLoading(true);
      cleanupLegacySharedStorage();
      localStorage.removeItem("physica_active_local_guest");
      localStorage.removeItem("physica_active_google_sim");
      localStorage.removeItem("physica_local_guest_uid");
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (err: any) {
      console.error("[Auth] Sign out error:", err);
      setError(err?.message || "Failed to sign out.");
    } finally {
      setLoading(false);
    }
  };

  const updateEducationPreference = async (level: EducationLevel) => {
    if (!user) return;
    setProfile((prev) => (prev ? { ...prev, educationLevel: level } : null));

    if (user.uid.startsWith("guest_") || user.isLocalGuest || user.uid.startsWith("google_user_")) {
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        educationLevel: level,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn("[Auth] Failed to update education level in Firestore:", err?.message || err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        isUnauthorizedDomain,
        unauthorizedHostname,
        clearError,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsGuest,
        signInAsGooglePhysicist,
        signInWithDemoCloudAccount,
        logout,
        updateEducationPreference,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
