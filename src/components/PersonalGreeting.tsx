"use client";

import { useEffect, useState } from "react";
import { getLinkedMember } from "@/lib/member-link";
import { getActivitiesForDates } from "@/lib/family-store";

export default function PersonalGreeting() {
  const [helperName, setHelperName] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setHelperName(getLinkedMember()?.helperName ?? null);
    refresh();
    window.addEventListener("member-sync", refresh);
    window.addEventListener("family-sync", refresh);
    return () => {
      window.removeEventListener("member-sync", refresh);
      window.removeEventListener("family-sync", refresh);
    };
  }, []);

  if (!helperName) return null;

  const today = new Date().toISOString().slice(0, 10);
  const mine = getActivitiesForDates([today]).filter(
    (a) => !a.cancelled && (a.owner?.includes(helperName) || a.collector?.includes(helperName))
  );
  if (!mine.length) return null;

  return (
    <div className="mb-3 rounded-xl bg-violet-50 p-3">
      <p className="text-sm font-black text-violet-700">👋 Hi {helperName}, don&apos;t forget:</p>
      <p className="text-xs text-violet-600">
        {mine.map((a) => `${a.owner?.includes(helperName) ? "🚗" : "🏠"} ${a.title}${a.allDay ? "" : ` (${a.time})`}`).join(" · ")}
      </p>
    </div>
  );
}
