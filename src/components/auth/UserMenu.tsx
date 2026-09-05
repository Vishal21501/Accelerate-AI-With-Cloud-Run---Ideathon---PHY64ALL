import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { AuthModal } from "./AuthModal";
import {
  User as UserIcon,
  LogOut,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";

export const UserMenu: React.FC = () => {
  const { user, profile, loading, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg border border-slate-200" />
    );
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </button>

        <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  const isGuest = user.isAnonymous;
  const displayName = profile?.displayName || user.displayName || (isGuest ? "Guest Scientist" : user.email?.split("@")[0] || "Physicist");
  const userPhoto = profile?.photoURL || user.photoURL;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
          isGuest
            ? "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100"
            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
        }`}
      >
        {userPhoto ? (
          <img
            src={userPhoto}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="w-5 h-5 rounded-full object-cover border border-slate-300"
          />
        ) : isGuest ? (
          <Sparkles className="w-4 h-4 text-amber-600" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
            {displayName[0]?.toUpperCase()}
          </div>
        )}

        <div className="flex flex-col text-left">
          <span className="font-semibold text-slate-800 leading-tight truncate max-w-[110px]">
            {displayName}
          </span>
          <span className="text-[10px] text-slate-500 leading-tight">
            {isGuest ? "Guest Session" : "Synced"}
          </span>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-slate-300"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
              <div className="truncate">
                <p className="font-bold text-xs text-slate-900 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  {user.email || (isGuest ? "Anonymous Guest" : "Authenticated")}
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px] bg-slate-50 px-2 py-1 rounded-md text-slate-600">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isGuest ? "Storage Mode" : "Firestore Rules"}</span>
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                isGuest ? "text-amber-700 bg-amber-100/70" : "text-emerald-700 bg-emerald-100/60"
              }`}>
                {isGuest ? "Local Device" : "Cloud Active"}
              </span>
            </div>
          </div>

          {isGuest && (
            <div className="p-2 my-1 bg-amber-50/70 border border-amber-200/70 rounded-lg text-xs">
              <p className="text-amber-800 text-[11px] leading-relaxed mb-2">
                You are in Guest mode. Your notes & quizzes are stored locally. Sign in with Google or Email to sync across devices via Firestore.
              </p>
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                Upgrade to Cloud Account
              </button>
            </div>
          )}

          <div className="py-1">
            <div className="px-2 py-1.5 text-[11px] text-slate-500 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Target Level: <strong className="capitalize text-slate-700">{profile?.educationLevel?.replace("_", " ") || "High School"}</strong>
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-1">
            <button
              onClick={async () => {
                setIsDropdownOpen(false);
                await logout();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
