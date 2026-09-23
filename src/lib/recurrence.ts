import type { FamilyActivity } from "./family-store";

/** Returns how `activity` occurs on `date` — with any per-date driver
 *  override applied, and a virtual id/date for a recurring occurrence —
 *  or null if it doesn't occur that day. Pure and framework-agnostic so
 *  both the client store and server-side notification jobs can share it. */
export function occursOnDate(activity: FamilyActivity, date: string): FamilyActivity | null {
  if (activity.excludedDates?.includes(date)) return null;
  const override = activity.driverOverrides?.[date];

  if (activity.date === date) {
    return override ? { ...activity, ...override } : activity;
  }

  if (activity.recurring === "weekly") {
    const activityDay = new Date(activity.date + "T12:00:00").getDay();
    const targetDay = new Date(date + "T12:00:00").getDay();
    if (activityDay === targetDay && activity.date <= date) {
      return { ...activity, ...(override || {}), id: `${activity.id}_${date}`, date };
    }
  }

  return null;
}
