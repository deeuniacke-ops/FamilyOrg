"use client";

import { useEffect, useState } from "react";
import { deriveFamilyId, getStoredFamilyId, storeFamilyId } from "@/lib/family-id";
import { initFamilySync } from "@/lib/family-store";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Toast from "@/components/Toast";

export default function FamilyGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const storedId = getStoredFamilyId();
    if (storedId) {
      initFamilySync(storedId);
      setReady(true);
    }
  }, []);

  const handleJoin = async () => {
    if (!name.trim() || !passphrase.trim() || joining) return;
    setJoining(true);
    const id = await deriveFamilyId(name, passphrase);
    storeFamilyId(id);
    initFamilySync(id, name.trim());
    setReady(true);
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center animate-fade-in">
        <h1 className="mb-1 text-3xl font-black tracking-tight text-violet-600">Clann</h1>
        <p className="mb-6 max-w-xs text-sm text-slate-500">
          Enter your family name and a shared passphrase. Anyone who enters the same two things sees the same family &mdash; everyone else gets a completely separate space.
        </p>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Family name"
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-sm text-slate-900 focus:border-violet-500 focus:outline-none"
          />
          <input
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            type="password"
            placeholder="Shared passphrase"
            onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-sm text-slate-900 focus:border-violet-500 focus:outline-none"
          />
          <button
            onClick={handleJoin}
            disabled={!name.trim() || !passphrase.trim() || joining}
            className="mt-1 w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-md transition-all active:bg-violet-700 disabled:opacity-30"
          >
            {joining ? "Joining…" : "Join Family"}
          </button>
        </div>
        <p className="mt-4 max-w-xs text-[11px] text-slate-400">
          Pick a passphrase you haven&apos;t used elsewhere &mdash; this isn&apos;t a real password, just a shared secret for your household.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-safe">
      <Header />
      <main className="px-4 py-4">{children}</main>
      <BottomNav />
      <Toast />
    </div>
  );
}
