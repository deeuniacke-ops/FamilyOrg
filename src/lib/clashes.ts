import type { FamilyActivity } from "./family-store";

function minutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function sameChildSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

/** Returns the ids of activities in `items` that overlap another activity
 *  for the same date with at least one shared child. Pure — used both
 *  client-side (on-screen clash badge) and server-side (shared agenda image). */
export function overlapIds(items: FamilyActivity[]) {
  const result = new Set<string>();
  items.forEach((a, i) => items.slice(i + 1).forEach((b) => {
    if (a.cancelled || b.cancelled || a.allDay || b.allDay || sameChildSet(a.childIds, b.childIds) || a.date !== b.date) return;
    const as = minutes(a.time), bs = minutes(b.time);
    if (as < bs + b.durationMinutes && bs < as + a.durationMinutes) { result.add(a.id); result.add(b.id); }
  }));
  return result;
}
