"use client";

import { useState } from "react";
import { getStoredFamilyId } from "@/lib/family-id";
import { showToast } from "@/components/Toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShareCapableNavigator = Navigator & { canShare?: (data: any) => boolean; share?: (data: any) => Promise<void> };

export default function ShareAgendaButton({ date }: { date: string }) {
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    const familyId = getStoredFamilyId();
    if (!familyId) { showToast("Join a family first", "error"); return; }
    setLoading(true);
    try {
      const url = `/api/agenda-image?familyId=${encodeURIComponent(familyId)}&date=${date}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to generate image");
      const blob = await res.blob();
      const file = new File([blob], `agenda-${date}.png`, { type: "image/png" });

      const nav = navigator as ShareCapableNavigator;
      if (typeof nav.canShare === "function" && nav.canShare({ files: [file] }) && nav.share) {
        try {
          await nav.share({ files: [file], title: "Today's Agenda" });
        } catch (err) {
          if ((err as DOMException)?.name !== "AbortError") throw err;
        }
      } else {
        window.open(URL.createObjectURL(blob), "_blank");
        showToast("Sharing isn't supported on this browser — image opened in a new tab, save and share manually", "info");
      }
    } catch {
      showToast("Couldn't generate the agenda image", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      aria-label="Share today's agenda"
      onClick={handleShare}
      disabled={loading}
      className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-base text-slate-500 shadow-sm disabled:opacity-50"
    >
      {loading ? "…" : "📤"}
    </button>
  );
}
