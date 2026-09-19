"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Child, FamilyActivity, getActivities, getActivitiesForDates, getChildren } from "@/lib/family-store";

function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(value: string, days: number) {
  const d = new Date(value + "T12:00:00");
  d.setDate(d.getDate() + days);
  return dateKey(d);
}
function timeLabel(time: string) { return new Date(`1970-01-01T${time}:00`).toLocaleTimeString("en-IE", { hour: "numeric", minute: "2-digit" }); }
function dayLabel(date: string) { return new Date(date + "T12:00:00").toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "short" }); }
function dateSummary(date: string) { return new Date(date + "T12:00:00").toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "short" }); }
function monthLabel(date: string) { return new Date(date + "T12:00:00").toLocaleDateString("en-IE", { month: "long", year: "numeric" }); }
function minutes(time: string) { const [h, m] = time.split(":").map(Number); return h * 60 + m; }
function overlapIds(items: FamilyActivity[]) {
  const result = new Set<string>();
  items.forEach((a, i) => items.slice(i + 1).forEach((b) => {
    if (a.childId === b.childId || a.date !== b.date) return;
    const as = minutes(a.time), bs = minutes(b.time);
    if (as < bs + b.durationMinutes && bs < as + a.durationMinutes) { result.add(a.id); result.add(b.id); }
  }));
  return result;
}

export default function HomePage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [rawActivities, setRawActivities] = useState<FamilyActivity[]>([]);
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [view, setView] = useState<"list" | "upcoming">("list");
  const [mounted, setMounted] = useState(false);

  const today = dateKey(new Date());
  const listDates = Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i));
  const activities = getActivitiesForDates(listDates);

  const refresh = () => { setChildren(getChildren()); setRawActivities(getActivities()); };
  useEffect(() => {
    refresh();
    setMounted(true);
    window.addEventListener("family-sync", refresh);
    return () => window.removeEventListener("family-sync", refresh);
  }, []);

  if (!mounted) return <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>;

  return <div className="animate-fade-in">
    <div className="mb-4 flex items-end justify-between">
      <div><h2 className="text-2xl font-black tracking-tight text-slate-900">Activities</h2><p className="text-xs text-slate-500 mt-1">{children.length} family members · Family calendar</p></div>
      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-600">Clann</span>
    </div>

    <div className="mb-3 flex rounded-xl bg-slate-100 p-1">
      <button onClick={() => setView("list")} className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${view === "list" ? "bg-white text-violet-600 shadow-sm" : "text-slate-400"}`}>This Week</button>
      <button onClick={() => setView("upcoming")} className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${view === "upcoming" ? "bg-white text-violet-600 shadow-sm" : "text-slate-400"}`}>Upcoming</button>
    </div>

    {view === "list" && <>
      <div className="mb-3 flex items-center gap-2">
        <button aria-label="Previous day" onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-500 shadow-sm">‹</button>
        <div className="flex-1 text-center"><p className="text-sm font-black text-slate-800">{dateSummary(selectedDate)}</p><p className="text-[10px] font-medium text-slate-400">{selectedDate === today ? "Today" : ""}</p></div>
        <button aria-label="Next day" onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-500 shadow-sm">›</button>
      </div>
      <button onClick={() => setSelectedDate(today)} className="mb-3 w-full rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-bold text-violet-700">
        Today · {new Date(today + "T12:00:00").toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "short" })}
      </button>

      <div className="flex flex-col gap-4">
        {listDates.map((date) => {
          const dayActivities = activities.filter((a) => a.date === date).sort((a, b) => a.time.localeCompare(b.time));
          const dayClashes = overlapIds(dayActivities);
          if (!dayActivities.length) return null;
          return <section key={date}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">{dayLabel(date)}</h3>
              {dayClashes.size > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">Clash</span>}
            </div>
            <div className="flex flex-col gap-2">
              {dayActivities.map((activity) => {
                const child = children.find((c) => c.id === activity.childId);
                const hasClash = dayClashes.has(activity.id);
                const realId = activity.id.replace(/_\d{4}-\d{2}-\d{2}$/, "");
                return <Link key={activity.id} href={`/activity/${realId}`} className={`flex items-center gap-3 rounded-xl border-2 bg-white p-3 shadow-sm active:bg-slate-50 transition-colors ${hasClash ? "border-red-200" : "border-slate-100"}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black text-white" style={{ backgroundColor: child?.color || "#94a3b8" }}>{child?.initials || "?"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{activity.title}</p>
                    <p className="text-xs text-slate-500">{child?.name} · {timeLabel(activity.time)} · {activity.durationMinutes}m</p>
                    {activity.location && <p className="text-[11px] text-slate-400">📍 {activity.location}</p>}
                    {activity.owner && <p className="text-[10px] font-bold text-pink-500">👤 {activity.owner}</p>}
                    {activity.recurring === "weekly" && <p className="text-[10px] font-bold text-violet-500">🔁 Weekly</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-slate-700">{activity.time}</p>
                    {hasClash && <p className="text-[10px] font-bold text-red-500">⚠ Clash</p>}
                  </div>
                </Link>;
              })}
            </div>
          </section>;
        })}
      </div>
    </>}

    {view === "upcoming" && (() => {
      // Generate dates for the next 90 days so weekly recurring activities expand
      const upcomingDates = Array.from({ length: 90 }, (_, i) => addDays(today, i));
      const expanded = getActivitiesForDates(upcomingDates);
      // Dedupe by id (expanded recurring activities get unique ids per date already)
      const seen = new Set<string>();
      const upcoming = expanded
        .filter((a) => { if (seen.has(a.id)) return false; seen.add(a.id); return true; })
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      if (!upcoming.length) return <p className="py-8 text-center text-sm text-slate-400">No upcoming activities. Tap + to add one.</p>;
      const months: Record<string, FamilyActivity[]> = {};
      for (const a of upcoming) { const m = monthLabel(a.date); (months[m] ??= []).push(a); }
      return <div className="flex flex-col gap-5">
        {Object.entries(months).map(([month, items]) => (
          <section key={month}>
            <h3 className="mb-2 text-sm font-black text-violet-600 uppercase tracking-wider">{month}</h3>
            <div className="flex flex-col gap-2">
              {items.map((activity) => {
                const child = children.find((c) => c.id === activity.childId);
                const realId = activity.id.replace(/_\d{4}-\d{2}-\d{2}$/, "");
                return <Link key={activity.id} href={`/activity/${realId}`} className="flex items-center gap-3 rounded-xl border-2 border-slate-100 bg-white p-3 shadow-sm active:bg-slate-50 transition-colors">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black text-white" style={{ backgroundColor: child?.color || "#94a3b8" }}>{child?.initials || "?"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{activity.title}</p>
                    <p className="text-xs text-slate-500">{child?.name} · {dayLabel(activity.date)}</p>
                    <p className="text-xs text-slate-400">{timeLabel(activity.time)} · {activity.durationMinutes}m</p>
                    {activity.location && <p className="text-[11px] text-slate-400">📍 {activity.location}</p>}
                    {activity.owner && <p className="text-[10px] font-bold text-pink-500">👤 {activity.owner}</p>}
                    {activity.recurring === "weekly" && <p className="text-[10px] font-bold text-violet-500">🔁 Weekly</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-slate-600">{new Date(activity.date + "T12:00:00").toLocaleDateString("en-IE", { day: "numeric", month: "short" })}</p>
                    <p className="text-sm font-black text-slate-700">{activity.time}</p>
                  </div>
                </Link>;
              })}
            </div>
          </section>
        ))}
      </div>;
    })()}

    <div className="mb-20" />
  </div>;
}
