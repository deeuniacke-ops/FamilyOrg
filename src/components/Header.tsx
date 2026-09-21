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
    <header className="sticky top-0 z-40 rounded-b-3xl bg-gradient-to-br from-violet-500 to-violet-700 px-5 pt-[env(safe-area-inset-top)] text-white shadow-md">
      <Link href="/about" className="flex h-16 flex-col justify-center">
        <h1 className="text-xl font-black tracking-tight">
          {mounted ? familyName : ""}
        </h1>
        <span className="text-white/70 text-[11px] font-semibold">
          Clann Family Organiser
        </span>
      </Link>
    </header>
  );
}
