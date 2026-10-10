"use client";

import { useEffect, useState } from "react";
import { getMyHelperName } from "@/lib/member-link";
import { getActivitiesForDates } from "@/lib/family-store";
import SwipeToAct from "@/components/SwipeToAct";

const DISMISS_KEY_PREFIX = "familyorg_greeting_dismissed_";

export default function PersonalGreeting() {
  const [helperName, setHelperName] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const refresh = () => setHelperName(getMyHelperName());
    refresh();
    try { setDismissed(localStorage.getItem(DISMISS_KEY_PREFIX + today) === "1"); } catch { /* ignore */ }
    window.addEventListener("my-identity-sync", refresh);
    window.addEventListener("family-sync", refresh);
    return () => {
      window.removeEventListener("my-identity-sync", refresh);
      window.removeEventListener("family-sync", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!helperName || dismissed) return null;

  const mine = getActivitiesForDates([today]).filter(
    (a) => !a.cancelled && (a.owner?.includes(helperName) || a.collector?.includes(helperName))
  );
  if (!mine.length) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY_PREFIX + today, "1"); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <SwipeToAct onTrigger={dismiss}>
      <div className="mb-3 flex items-start gap-2 rounded-xl bg-violet-50 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-violet-700">👋 Hi {helperName}, don&apos;t forget:</p>
          <p className="text-xs text-violet-600">
            {mine.map((a) => `${a.owner?.includes(helperName) ? "🚗" : "🏠"} ${a.title}${a.allDay ? "" : ` (${a.time})`}`).join(" · ")}
          </p>
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-xs font-bold text-violet-400">✕</button>
      </div>
    </SwipeToAct>
  );
}
