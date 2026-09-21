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
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur px-5 pt-[env(safe-area-inset-top)]">
      <Link href="/about" className="flex h-14 items-center justify-between">
        <h1 className="text-xl font-black tracking-tight text-slate-800">
          {mounted ? familyName : ""}
        </h1>
        <span className="text-slate-400 text-[11px] font-semibold">
          Clann Family Organiser
        </span>
      </Link>
    </header>
  );
}
