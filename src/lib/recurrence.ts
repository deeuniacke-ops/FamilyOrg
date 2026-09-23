import type { FamilyActivity } from "./family-store";

/** Returns how `activity` occurs on `date` — with any per-date driver
 *  override applied, and a virtual id/date for a recurring occurrence —
 *  or null if it doesn't occur that day. Pure and framework-agnostic so
 *  both the client store and server-side notification jobs can share it. */
export function occursOnDate(activity: FamilyActivity, date: string): FamilyActivity | null {
  const override = activity.driverOverrides?.[date];
  // A cancelled occurrence still shows (struck-through in the UI) — it's
  // just marked, never hidden. The whole activity/series being cancelled
  // applies to every occurrence.
  const cancelled = activity.cancelled || activity.excludedDates?.includes(date) || undefined;

  if (activity.date === date) {
    return { ...activity, ...(override || {}), cancelled };
  }

  if (activity.recurring === "weekly") {
    const activityDay = new Date(activity.date + "T12:00:00").getDay();
    const targetDay = new Date(date + "T12:00:00").getDay();
    if (activityDay === targetDay && activity.date <= date) {
      return { ...activity, ...(override || {}), id: `${activity.id}_${date}`, date, cancelled };
    }
  }

  return null;
}
