"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getFamilyName } from "@/lib/family-store";

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const [familyName, setFamilyName] = useState("");
  useEffect(() => {
    const refresh = () => setFamilyName(getFamilyName());
    refresh();
    setMounted(true);
    window.addEventListener("family-sync", refresh);
    return () => window.removeEventListener("family-sync", refresh);
  }, []);

  return (
    <header className="sticky top-0 z-40 rounded-b-3xl bg-gradient-to-br from-indigo-100 to-indigo-200 px-5 pt-[env(safe-area-inset-top)] shadow-sm">
      <Link href="/about" className="flex flex-col justify-center gap-0.5 py-3 min-w-0">
        <h1 className="truncate text-xl font-black tracking-tight text-slate-800">
          {mounted ? familyName : ""}
        </h1>
        <span className="text-indigo-700/70 text-[11px] font-semibold">
          Clann Family Organiser
        </span>
      </Link>
    </header>
  );
}
