"use client";

import { useState, useEffect } from "react";
import { getClubName } from "@/lib/store";

export default function Header() {
  const [clubName, setClubName] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setClubName(getClubName());
    setMounted(true);

    // Listen for club name changes from other parts of the app
    const handleStorage = () => setClubName(getClubName());
    window.addEventListener("club-name-changed", handleStorage);
    return () => window.removeEventListener("club-name-changed", handleStorage);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-pitch-700 to-cw-red text-white px-5 pt-[env(safe-area-inset-top)] shadow-md">
      <div className="flex items-center justify-between h-14">
        <h1 className="text-xl font-bold tracking-tight">
          {mounted ? clubName : ""}
        </h1>
        <button
          onClick={() => {
            try {
              localStorage.removeItem("cluichi_auth");
              localStorage.removeItem("cluichi_role");
            } catch {}
            window.location.reload();
          }}
          className="text-white/40 text-[11px] font-semibold tracking-wide active:text-white/70"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
