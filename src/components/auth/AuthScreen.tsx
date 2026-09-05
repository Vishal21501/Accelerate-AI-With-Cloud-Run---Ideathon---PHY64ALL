import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Atom,
  Lock,
  Mail,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Waves,
  BookOpen,
  Award,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Activity,
  Calculator,
  Volume2,
} from "lucide-react";

export const AuthScreen: React.FC = () => {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInAsGuest,
    signInAsGooglePhysicist,
    signInWithDemoCloudAccount,
    error: authError,
    isUnauthorizedDomain,
    unauthorizedHostname,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHost = unauthorizedHostname || (typeof window !== "undefined" ? window.location.hostname : "");

  const handleCopyDomain = async () => {
    if (!currentHost) return;
    try {
      await navigator.clipboard.writeText(currentHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    } catch {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = currentHost;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLocalError(null);
      clearError();
      setIsSubmitting(true);
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code === "auth/popup-blocked") {
        setLocalError(
          "The Google sign-in popup was blocked by your browser. Please allow popups for this page or click 'Continue as Guest' below."
        );
      } else if (err?.code === "auth/popup-closed-by-user") {
        setLocalError("Google sign-in popup was closed before finishing.");
      } else if (
        err?.code === "auth/unauthorized-domain" ||
        err?.message?.includes("unauthorized-domain")
      ) {
        setLocalError(
          `Domain '${currentHost}' is not in your Firebase authorized domains list.`
        );
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
    } catch (err: any) {
      setLocalError(err?.message || "Failed to start guest session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError("Please enter both email and password.");
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
    } catch (err: any) {
      setLocalError(err?.message || "Authentication failed. Please verify your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || authError;
  const showDomainHelper =
    isUnauthorizedDomain ||
    displayError?.includes("unauthorized-domain") ||
    displayError?.includes("authorized domains");
  const showApiKeyHelper =
    displayError?.includes("api-key-not-valid") ||
    displayError?.includes("API key not valid") ||
    displayError?.includes("invalid-api-key") ||
    displayError?.includes("API key restriction");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* Background visual geometry */}
      <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-[-15%] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-600/30 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[15%] w-[500px] h-[500px] rounded-full bg-indigo-600/25 blur-[120px]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Top Brand Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <Atom className="w-6 h-6 text-white animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white font-mono">
                  PHY64ALL
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-900/60 border border-blue-700/50 text-blue-300">
                  Multi Sensory Physics
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Learning Made Fun and Interactive
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secure Cloud Access</span>
          </div>
        </div>
      </header>

      {/* Main Authentication & Showcase Area */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col lg:flex-row items-center justify-center gap-10">
        {/* Left Column: Platform Overview & Feature Showcase */}
        <div className="flex-1 max-w-lg space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-Sensory Physics Laboratory & AI Tutor</span>
          </div>

          <h1
            id="auth-hero-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight"
          >
            Discover, Experiment, and Learn Physics with PHY64ALL.
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Welcome to PHY64ALL — where physics is made fun, interactive, and multi-sensory. Access interactive mathematical simulation laboratories, multi-sensory audio sonification, an AI step-by-step problem solver, concept explorer, and adaptive quizzes tailored from Explorer to Master's level.
          </p>

          {/* 4 Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs mb-1">
                <Activity className="w-4 h-4" />
                <span>Interactive Simulation Labs</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Kinematics, oscillations, wave optics, Lorentz E&M, Coulomb fields, quantum wells, Kepler orbits, thermodynamics, semiconductors, nuclear decay & photoelectric effect.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                <Calculator className="w-4 h-4" />
                <span>Step-by-Step AI Problem Solver</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Mathematical derivations with KaTeX rendering, SI units, formula breakdowns, and level-adaptive AI physics tutoring.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs mb-1">
                <Volume2 className="w-4 h-4" />
                <span>Multi-Sensory Audio Sonification</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Hear physical phenomena in real time: frequency Doppler shifts, Geiger radiation clicks, cyclotron pitch, and orbital celestial harmonies.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs mb-1">
                <Award className="w-4 h-4" />
                <span>Concept Explorer & Quiz Arena</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Deep conceptual explanations, interactive AI chat tutor, and audio-assisted quizzes across Explorer, High School, College, and Master's levels.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Sign In Card */}
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {mode === "signin" ? "Sign In to PHY64ALL" : "Create Scientist Account"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Sign in with your Google account or email to access your personal laboratory notebook and cloud experiments.
            </p>
          </div>

          {/* Error Banner */}
          {displayError && !showDomainHelper && !showApiKeyHelper && (
            <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-800/70 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{displayError}</span>
            </div>
          )}

          {/* API Key Configuration Helper Card */}
          {showApiKeyHelper && (
            <div className="mb-5 p-4 bg-blue-950/40 border border-blue-500/50 rounded-xl text-left text-xs space-y-3">
              <div className="flex items-start gap-2 text-blue-300 font-semibold">
                <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Google Cloud API Key Configuration Notice</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Your Cloud Run service is active. To enable Google Sign-In on this custom URL:
              </p>

              <div className="text-[11px] text-slate-300 space-y-1 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <p className="font-semibold text-slate-200">In Google Cloud Console (PHY64ALL-APP):</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[10px]">
                  <li>Go to <b>APIs &amp; Services &gt; Credentials</b></li>
                  <li>Click your API key &gt; under <b>API restrictions</b>, allow <b>Identity Toolkit API</b> &amp; <b>Token Service API</b></li>
                  <li>Under <b>Application restrictions</b>, ensure HTTP Referrers include your Cloud Run URL or set to None</li>
                </ol>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleGuestSignIn}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Enter Physics Laboratory in Guest Mode (Instant Access)</span>
                </button>
              </div>
            </div>
          )}

          {/* Domain Authorization Helper Card */}
          {showDomainHelper && (
            <div className="mb-5 p-4 bg-amber-950/40 border border-amber-500/50 rounded-xl text-left text-xs space-y-3">
              <div className="flex items-start gap-2 text-amber-300 font-semibold">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Domain Authorization Needed for Google OAuth</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Firebase blocks Google popups until this preview domain is added to your project's authorized domains list:
              </p>

              {/* Copy Hostname Box */}
              <div className="flex items-center justify-between gap-2 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 font-mono text-[11px] text-amber-200">
                <span className="truncate">{currentHost}</span>
                <button
                  type="button"
                  onClick={handleCopyDomain}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[10px] font-sans font-medium transition-colors cursor-pointer"
                  title="Copy domain to clipboard"
                >
                  {copiedDomain ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Domain</span>
                    </>
                  )}
                </button>
              </div>

              {/* 3 Steps */}
              <div className="text-[11px] text-slate-300 space-y-1 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <p className="font-semibold text-slate-200">Steps to authorize in Firebase Console:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[10px]">
                  <li>
                    Open <b>Firebase Console &gt; PHY64ALL-APP &gt; Authentication &gt; Settings</b>
                  </li>
                  <li>
                    Under <b>Authorized domains</b>, click <b>Add domain</b> and paste the domain above
                  </li>
                  <li>Return here and click <b>Continue with Google</b></li>
                </ol>
              </div>

              {/* Instant Bypass Buttons */}
              <div className="pt-1 border-t border-amber-900/60">
                <p className="text-[10px] text-slate-400 mb-2">Or enter instantly right now without waiting:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleInstantGoogleAccess}
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Enter as Google User</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCloudDemoSignIn}
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>1-Click Cloud Login</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Prominent Instant Guest Mode Access */}
          <div className="mb-5">
            <button
              type="button"
              id="guest-signin-btn-top"
              onClick={handleGuestSignIn}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-900/20 border border-emerald-400/30 transition-all cursor-pointer disabled:opacity-60 active:scale-[0.99]"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Explore Laboratory in Guest Mode (Instant Access)</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-1.5">
              Instant entry to all 11 physics simulation labs &amp; AI tools
            </p>
          </div>

          <div className="relative flex py-2 items-center mb-4">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="shrink-0 mx-3 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
              Or Sign In with Account
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <div className="space-y-4">
            {/* Primary Google Sign In Button */}
            <div>
              <button
                type="button"
                id="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm rounded-xl border border-white/20 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 active:scale-[0.99]"
              >
                {/* Official Google G Logo */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              <p className="text-[11px] text-slate-400 text-center mt-1.5">
                Recommended for fast single-click access
              </p>
            </div>

            {/* Divider */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="shrink-0 mx-3 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                Or With Email
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmitEmail} className="space-y-3.5">
              {mode === "signup" && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Your Name / Handle
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Dr. Marie Curie"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 text-sm text-white placeholder:text-slate-600 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="physicist@institution.edu"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 text-sm text-white placeholder:text-slate-600 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950/80 text-sm text-white placeholder:text-slate-600 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="email-submit-btn"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60 mt-1 active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : mode === "signin" ? (
                  <>
                    <span>Sign In with Email</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Mode switch */}
            <div className="pt-2 text-center text-xs text-slate-400">
              {mode === "signin" ? (
                <p>
                  Don't have an account yet?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setLocalError(null);
                      clearError();
                    }}
                    className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
                  >
                    Create one here
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
                      clearError();
                    }}
                    className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
                  >
                    Sign in here
                  </button>
                </p>
              )}
            </div>

            {/* Guest Exploration Option */}
            <div className="pt-3 border-t border-slate-800/80">
              <button
                type="button"
                id="guest-signin-btn"
                onClick={handleGuestSignIn}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-medium text-xs rounded-xl border border-slate-700/60 transition-all cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Guest Mode</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PHY64ALL • Multi-Sensory Physics Laboratory & AI Step-by-Step Problem Solver</span>
          <span>Firestore Security Rules Enforced • Protected User Sandboxes</span>
        </div>
      </footer>
    </div>
  );
};
