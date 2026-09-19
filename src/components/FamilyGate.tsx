"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { deriveFamilyId, getStoredFamilyId, storeFamilyId } from "@/lib/family-id";
import { initFamilySync } from "@/lib/family-store";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Toast from "@/components/Toast";

export default function FamilyGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [checking, setChecking] = useState(false);
  const [joining, setJoining] = useState(false);
  const [pendingNewFamily, setPendingNewFamily] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const storedId = getStoredFamilyId();
    if (storedId) {
      initFamilySync(storedId);
      setReady(true);
    }
  }, []);

  const completeJoin = (id: string, seedName?: string) => {
    setJoining(true);
    storeFamilyId(id);
    initFamilySync(id, seedName);
    setPendingNewFamily(null);
    setReady(true);
  };

  const handleJoin = async () => {
    if (!name.trim() || !passphrase.trim() || joining || checking) return;
    setChecking(true);
    const id = await deriveFamilyId(name, passphrase);
    try {
      const existing = await getDoc(doc(db, "families", id, "settings", "family"));
      setChecking(false);
      if (existing.exists()) completeJoin(id);
      else setPendingNewFamily({ id, name: name.trim() });
    } catch {
      setChecking(false);
      completeJoin(id, name.trim());
    }
  };

  if (pendingNewFamily) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center animate-fade-in">
        <h1 className="mb-1 text-2xl font-black tracking-tight text-violet-600">New family?</h1>
        <p className="mb-6 max-w-xs text-sm text-slate-500">
          Nobody has used the name <strong>&ldquo;{pendingNewFamily.name}&rdquo;</strong> with that exact passphrase before. Continuing will create a brand-new, empty family space.
        </p>
        <p className="mb-6 max-w-xs text-sm text-slate-500">
          If you meant to join a family that already exists, go back and double-check the name and passphrase &mdash; passphrases are case-sensitive.
        </p>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button
            onClick={() => completeJoin(pendingNewFamily.id, pendingNewFamily.name)}
            disabled={joining}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-md transition-all active:bg-violet-700 disabled:opacity-30"
          >
            {joining ? "Creating…" : `Yes, create "${pendingNewFamily.name}"`}
          </button>
          <button
            onClick={() => setPendingNewFamily(null)}
            className="w-full rounded-xl border-2 border-gray-200 py-3 text-sm font-bold text-slate-500"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

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
            disabled={!name.trim() || !passphrase.trim() || joining || checking}
            className="mt-1 w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-md transition-all active:bg-violet-700 disabled:opacity-30"
          >
            {checking ? "Checking…" : joining ? "Joining…" : "Join Family"}
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
