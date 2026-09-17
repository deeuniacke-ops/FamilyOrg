"use client";

import { useState, useEffect, useRef } from "react";

export type AuthRole = "admin" | "player";

type ClubCode = { code: string; role: AuthRole };

const CLUBS = [
  {
    id: "wanderers",
    name: "Cork Wanderers",
    emoji: "🏑",
    codes: [
      { code: "wanderers2026", role: "admin" as AuthRole },
      { code: "wanderersplayer", role: "player" as AuthRole },
    ],
  },
];

const AUTH_KEY = "cluichi_auth";
const ROLE_KEY = "cluichi_role";

function findMatch(input: string): { club: typeof CLUBS[0]; match: ClubCode } | null {
  const normalized = input.trim().toLowerCase();
  for (const club of CLUBS) {
    const match = club.codes.find((c) => c.code === normalized);
    if (match) return { club, match };
  }
  return null;
}

function isAuthenticated(): boolean {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (!stored) return false;
    return CLUBS.some((c) => c.codes.some((cc) => cc.code === stored));
  } catch {
    return false;
  }
}

/** Get the current user's role — call from any component */
export function getAuthRole(): AuthRole {
  try {
    const role = localStorage.getItem(ROLE_KEY);
    if (role === "admin" || role === "player") return role;
  } catch {}
  return "player"; // default to least privilege
}

export function isAdmin(): boolean {
  return getAuthRole() === "admin";
}

type Step = "club" | "code";

function LandingPage({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<Step>(CLUBS.length === 1 ? "code" : "club");
  const [selectedClub, setSelectedClub] = useState(CLUBS.length === 1 ? CLUBS[0] : null);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "code") inputRef.current?.focus();
  }, [step]);

  const handleClubPick = (club: typeof CLUBS[0]) => {
    setSelectedClub(club);
    setStep("code");
  };

  const handleSubmit = () => {
    if (!selectedClub) return;
    const result = findMatch(code);
    if (result && result.club.id === selectedClub.id) {
      try {
        localStorage.setItem(AUTH_KEY, result.match.code);
        localStorage.setItem(ROLE_KEY, result.match.role);
      } catch {}
      onSuccess();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pitch-600 via-pitch-800 to-pitch-900 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🏑</div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
          Cluichí
        </h1>
        <p className="text-pitch-200 text-sm font-medium">
          Team availability, sorted.
        </p>
      </div>

      {/* Step 1: Club picker */}
      {step === "club" && (
        <div className="w-full max-w-xs animate-fade-in">
          <label className="block text-xs font-semibold text-pitch-200 uppercase tracking-wider mb-3 text-center">
            Select your club
          </label>
          <div className="space-y-2">
            {CLUBS.map((club) => (
              <button
                key={club.id}
                onClick={() => handleClubPick(club)}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-white/10 border-2 border-white/20 text-white active:bg-white/20 transition-all text-left"
              >
                <span className="text-2xl">{club.emoji}</span>
                <span className="text-sm font-bold">{club.name}</span>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="ml-auto text-white/40"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Club code */}
      {step === "code" && selectedClub && (
        <div className="w-full max-w-xs animate-fade-in">
          {/* Selected club badge */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-lg">{selectedClub.emoji}</span>
            <span className="text-sm font-bold text-white">{selectedClub.name}</span>
            {CLUBS.length > 1 && (
              <button
                onClick={() => { setStep("club"); setSelectedClub(null); setCode(""); setError(false); }}
                className="text-pitch-300 text-xs font-medium ml-1 underline decoration-dotted active:text-white"
              >
                Change
              </button>
            )}
          </div>

          <div className={shake ? "animate-shake" : ""}>
            <label className="block text-xs font-semibold text-pitch-200 uppercase tracking-wider mb-2 text-center">
              Club Code
            </label>
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Enter your club code"
              autoComplete="off"
              autoCapitalize="off"
              className={`w-full px-4 py-3.5 rounded-xl text-center text-sm font-medium bg-white/10 text-white placeholder:text-white/30 border-2 outline-none transition-colors ${
                error
                  ? "border-red-400 bg-red-500/10"
                  : "border-white/20 focus:border-white/50"
              }`}
            />
            {error && (
              <p className="text-red-300 text-xs text-center mt-2 font-medium animate-fade-in">
                Wrong code — ask your team captain
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!code.trim()}
              className="w-full mt-4 py-3.5 rounded-xl bg-cw-red text-white text-sm font-bold disabled:opacity-30 active:bg-cw-red-dark transition-all"
            >
              Enter
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-pitch-400 text-[11px] mt-12">
        Availability · Fixtures · Squad Planning
      </p>
    </div>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!authed) {
    return <LandingPage onSuccess={() => setAuthed(true)} />;
  }

  return <>{children}</>;
}
