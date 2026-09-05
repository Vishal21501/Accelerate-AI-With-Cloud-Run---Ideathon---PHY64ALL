import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  ShieldAlert,
  Sparkles,
  Loader2,
  ArrowRight,
  Copy,
  Check,
  Cpu,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup" | "guest";
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = "signin" }) => {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInAsGuest,
    signInAsGooglePhysicist,
    signInWithDemoCloudAccount,
    error,
    isUnauthorizedDomain,
    unauthorizedHostname,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHost = unauthorizedHostname || (typeof window !== "undefined" ? window.location.hostname : "");

  if (!isOpen) return null;

  const handleCopyDomain = async () => {
    if (!currentHost) return;
    try {
      await navigator.clipboard.writeText(currentHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = currentHost;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLocalError(null);
      clearError();
      setIsSubmitting(true);
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      if (
        err?.code === "auth/unauthorized-domain" ||
        err?.message?.includes("unauthorized-domain")
      ) {
        setLocalError(`Domain '${currentHost}' must be authorized in Firebase Console.`);
      } else {
        setLocalError(err?.message || "Failed to sign in with Google.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstantGoogleAccess = async () => {
    try {
      setLocalError(null);
      clearError();
      setIsSubmitting(true);
      await signInAsGooglePhysicist("vishalsampath2001@gmail.com", "Vishal Sampath");
      onClose();
    } catch (err: any) {
      setLocalError(err?.message || "Failed to start Google session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloudDemoSignIn = async () => {
    try {
      setLocalError(null);
      clearError();
      setIsSubmitting(true);
      await signInWithDemoCloudAccount();
      onClose();
    } catch (err: any) {
      setLocalError(err?.message || "Failed to authenticate demo account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestSignIn = async () => {
    try {
      setLocalError(null);
      clearError();
      setIsSubmitting(true);
      await signInAsGuest();
      onClose();
    } catch (err: any) {
      setLocalError(err?.message || "Failed to sign in as guest.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError("Please provide both email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (mode === "signup") {
        if (password.length < 6) {
          setLocalError("Password must be at least 6 characters.");
          setIsSubmitting(false);
          return;
        }
        await signUpWithEmail(email, password, displayName || undefined);
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      setLocalError(err?.message || "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {mode === "signin" ? "Sign In to PHY64ALL" : "Create Scientist Account"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Securely sync lab experiments, solved derivations, and quiz progress.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {activeError && !isUnauthorizedDomain && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{activeError}</span>
            </div>
          )}

          {/* Domain Authorization Helper in Modal */}
          {(isUnauthorizedDomain || activeError?.includes("authorized in Firebase Console") || activeError?.includes("unauthorized-domain")) && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-2.5">
              <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Domain Authorization Needed</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Add this preview hostname to your Firebase Console under <b>Authentication &gt; Settings &gt; Authorized domains</b>:
              </p>
              <div className="flex items-center justify-between gap-1.5 bg-white border border-amber-200 rounded-lg px-2 py-1.5 font-mono text-[11px] text-amber-900">
                <span className="truncate">{currentHost}</span>
                <button
                  type="button"
                  onClick={handleCopyDomain}
                  className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-[10px] font-sans font-medium transition-colors"
                >
                  {copiedDomain ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={handleInstantGoogleAccess}
                  disabled={isSubmitting}
                  className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Instant Google Mode
                </button>
                <button
                  type="button"
                  onClick={handleCloudDemoSignIn}
                  disabled={isSubmitting}
                  className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                >
                  1-Click Cloud Login
                </button>
              </div>
            </div>
          )}

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl border border-slate-300 shadow-2xs hover:border-slate-400 transition-all cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Guest Mode */}
          <button
            type="button"
            onClick={handleGuestSignIn}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-xl transition-all cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Continue in Anonymous Guest Mode (Instant Access)</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="shrink-0 mx-3 text-slate-400 text-xs uppercase tracking-wider font-semibold">
              Or with Email
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmitEmail} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name / Callsign
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Richard Feynman"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="physicist@university.edu"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : mode === "signin" ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="pt-2 text-center text-xs text-slate-600">
            {mode === "signin" ? (
              <p>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setLocalError(null);
                  }}
                  className="text-blue-600 font-semibold hover:underline cursor-pointer ml-1"
                >
                  Sign up now
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setLocalError(null);
                  }}
                  className="text-blue-600 font-semibold hover:underline cursor-pointer ml-1"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
