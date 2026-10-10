"use client";

import { useEffect, useState } from "react";
import { getMyIdentity, MyIdentity } from "@/lib/member-link";
import { getActivitiesForDates, getChildren } from "@/lib/family-store";
import { matchRoles, describeActivityForMe } from "@/lib/activity-roles";
import SwipeToAct from "@/components/SwipeToAct";

const DISMISS_KEY_PREFIX = "familyorg_greeting_dismissed_";

export default function PersonalGreeting() {
  const [identity, setIdentity] = useState<MyIdentity | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const refresh = () => setIdentity(getMyIdentity());
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

  if (!identity || dismissed) return null;

  const children = getChildren();
  const lines = getActivitiesForDates([today])
    .filter((a) => !a.cancelled)
    .flatMap((a) => {
      const roles = matchRoles(identity, a);
      if (!roles.length) return [];
      const childNames = children.filter((c) => a.childIds.includes(c.id)).map((c) => c.name);
      return describeActivityForMe(roles, a, childNames);
    });
  if (!lines.length) return null;

  const myName = identity.name;
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY_PREFIX + today, "1"); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <SwipeToAct onTrigger={dismiss}>
      <div className="mb-3 flex items-start gap-2 rounded-xl bg-violet-50 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-violet-700">👋 Hi {myName}, don&apos;t forget:</p>
          <p className="text-xs text-violet-600">{lines.join(" · ")}</p>
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-xs font-bold text-violet-400">✕</button>
      </div>
    </SwipeToAct>
  );
}
