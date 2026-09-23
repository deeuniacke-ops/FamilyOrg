"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getActivities, getChildren, getHelpers, updateActivity, removeActivity, cancelActivityOccurrence, uncancelActivityOccurrence, setActivityCancelled, updateActivityDrivers, Child, FamilyActivity } from "@/lib/family-store";

function timeLabel(time: string) {
  return new Date(`1970-01-01T${time}:00`).toLocaleTimeString("en-IE", { hour: "numeric", minute: "2-digit" });
}

export default function ActivityEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [children, setChildren] = useState<Child[]>([]);
  const [helpers, setHelpers] = useState<string[]>([]);
  const [activity, setActivity] = useState<FamilyActivity | null>(null);
  const [mounted, setMounted] = useState(false);

  // Editable fields
  const [childIds, setChildIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [allDay, setAllDay] = useState(false);
  const [customDuration, setCustomDuration] = useState(false);
  const [location, setLocation] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [owner, setOwner] = useState<string[]>([]);
  const [collector, setCollector] = useState<string[]>([]);
  const [showCollector, setShowCollector] = useState(false);
  const [notes, setNotes] = useState("");
  const [occurrenceDate, setOccurrenceDate] = useState("");

  useEffect(() => {
    const kids = getChildren();
    setChildren(kids);
    setHelpers(getHelpers());
    const all = getActivities();
    const found = all.find((a) => a.id === id);
    if (found) {
      const isRecurring = found.recurring === "weekly";
      const occDate = searchParams.get("date") || found.date;
      const driverOverride = isRecurring ? found.driverOverrides?.[occDate] : undefined;
      setActivity(found);
      setOccurrenceDate(occDate);
      setChildIds(found.childIds);
      setTitle(found.title);
      setDate(found.date);
      setTime(found.time);
      setDuration(found.durationMinutes);
      setAllDay(!!found.allDay);
      setCustomDuration(![30, 60, 90, 120].includes(found.durationMinutes));
      setLocation(found.location || "");
      setRecurring(isRecurring);
      setOwner(driverOverride?.owner ?? found.owner ?? []);
      setCollector(driverOverride?.collector ?? found.collector ?? []);
      setShowCollector(!!(driverOverride?.collector ?? found.collector)?.length);
      setNotes(found.notes || "");
    }
    setMounted(true);
    const refreshChildren = () => { setChildren(getChildren()); setHelpers(getHelpers()); };
    window.addEventListener("family-sync", refreshChildren);
    return () => window.removeEventListener("family-sync", refreshChildren);
  }, [id, searchParams]);

  const handleSave = () => {
    if (!childIds.length || !title.trim() || !date || !(time || allDay)) return;
    updateActivity(id, {
      childIds,
      title: title.trim(),
      date,
      time: allDay ? "00:00" : time,
      durationMinutes: allDay ? 1440 : duration,
      allDay: allDay || undefined,
      location: location.trim() || undefined,
      recurring: recurring ? "weekly" : undefined,
      notes: notes.trim() || undefined,
      ...(recurring ? {} : { owner: owner.length ? owner : undefined, collector: collector.length ? collector : undefined }),
    });
    if (recurring) {
      updateActivityDrivers(id, occurrenceDate, { owner: owner.length ? owner : undefined, collector: collector.length ? collector : undefined });
    }
    router.back();
  };

  const handleDelete = () => {
    removeActivity(id);
    router.push("/");
  };

  const occurrenceCancelled = recurring && !!activity?.excludedDates?.includes(occurrenceDate);
  const seriesCancelled = !!activity?.cancelled;

  const handleToggleOccurrenceCancel = () => {
    if (occurrenceCancelled) uncancelActivityOccurrence(id, occurrenceDate);
    else cancelActivityOccurrence(id, occurrenceDate);
    router.push("/");
  };

  const handleToggleSeriesCancel = () => {
    setActivityCancelled(id, !seriesCancelled);
    router.push("/");
  };

  if (!mounted) return null;
  if (!activity) return (
    <div className="animate-fade-in py-16 text-center">
      <p className="text-slate-400 text-sm">Activity not found</p>
      <button onClick={() => router.back()} className="mt-4 text-violet-600 text-sm font-bold">Go back</button>
    </div>
  );

  const activityChildren = children.filter((c) => activity.childIds.includes(c.id));

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm font-medium text-slate-500 active:text-slate-700 mb-4 -ml-1">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back
      </button>

      <h2 className="text-xl font-bold text-slate-900 mb-1">Edit Activity</h2>
      <p className="text-sm text-slate-400 mb-5">
        {activityChildren.map((c) => c.name).join(", ")} · {activity.allDay ? "All day" : timeLabel(activity.time)} · {occurrenceDate}
      </p>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
        {/* Family member picker */}
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Family Member(s)</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {children.map((c) => (
            <button key={c.id} type="button" onClick={() => setChildIds((prev) => prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id])} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${childIds.includes(c.id) ? "ring-2 ring-violet-500 bg-white shadow" : "bg-gray-100 text-slate-500"}`}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full text-slate-700 text-[9px] font-black" style={{ backgroundColor: c.color }}>{c.initials}</span>
              {c.name}
            </button>
          ))}
        </div>

        {/* Title */}
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Activity name" className="w-full mb-3 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-violet-500 focus:outline-none text-sm" />

        {/* Date + time */}
        <div className="flex gap-2 mb-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 focus:border-violet-500 focus:outline-none text-sm" />
          {!allDay && (
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-24 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 focus:border-violet-500 focus:outline-none text-sm" />
          )}
        </div>
        <button
          type="button"
          onClick={() => setAllDay((v) => !v)}
          className={`mb-1 flex items-center gap-1.5 text-[11px] font-bold transition-colors ${allDay ? "text-violet-600" : "text-slate-400"}`}
        >
          <span className={`flex h-4 w-4 items-center justify-center rounded-md border-2 ${allDay ? "border-violet-600 bg-violet-600 text-white" : "border-gray-300"}`}>
            {allDay && "✓"}
          </span>
          All day
        </button>
        {recurring && <p className="text-[10px] text-slate-400 mb-3">Date/time here apply to the whole weekly series</p>}
        {!recurring && <div className="mb-3" />}

        {/* Duration chips */}
        {!allDay && (
          <>
            <div className="flex gap-1.5 mb-3">
              {[30, 60, 90, 120].map((mins) => (
                <button key={mins} type="button" onClick={() => { setDuration(mins); setCustomDuration(false); }} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${!customDuration && duration === mins ? "bg-violet-600 text-white shadow" : "bg-gray-100 text-slate-400"}`}>
                  {mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}`}
                </button>
              ))}
              <button type="button" onClick={() => setCustomDuration(true)} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${customDuration ? "bg-violet-600 text-white shadow" : "bg-gray-100 text-slate-400"}`}>
                Custom
              </button>
            </div>
            {customDuration && (
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(Math.max(5, Number(e.target.value) || 0))}
                  className="w-20 px-2 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-center text-sm text-slate-900 focus:border-violet-500 focus:outline-none"
                />
                <span className="text-xs font-medium text-slate-400">minutes</span>
              </div>
            )}
          </>
        )}

        {/* Location */}
        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" className="w-full mb-3 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-violet-500 focus:outline-none text-sm" />

        {/* Owner picker */}
        <div className="mb-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">🚗 Who&apos;s bringing them? (pick any that apply)</p>
          {recurring && <p className="text-[10px] text-violet-500 font-semibold mb-1.5 -mt-1">Applies to {occurrenceDate} only - other occurrences keep their own driver</p>}
          <div className="flex flex-wrap gap-1.5">
            {helpers.map((o) => (
              <button key={o} type="button" onClick={() => setOwner((prev) => prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o])} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${owner.includes(o) ? "bg-pink-500 text-white shadow" : "bg-gray-100 text-slate-400"}`}>
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* Collector (collapsed unless already set) */}
        {!showCollector && (
          <button type="button" onClick={() => setShowCollector(true)} className="mb-3 text-xs font-bold text-violet-500">
            🏠 + Someone else collecting them?
          </button>
        )}
        {showCollector && (
          <div className="mb-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">🏠 Who&apos;s collecting them?</p>
            <div className="flex flex-wrap gap-1.5">
              {helpers.map((o) => (
                <button key={o} type="button" onClick={() => setCollector((prev) => prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o])} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${collector.includes(o) ? "bg-pink-500 text-white shadow" : "bg-gray-100 text-slate-400"}`}>
                  {o}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional) — e.g. bring shin pads, entrance around the back"
          rows={2}
          className="w-full mb-3 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-violet-500 focus:outline-none text-sm resize-none"
        />

        {/* Recurring toggle */}
        <button type="button" onClick={() => setRecurring(!recurring)} className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${recurring ? "bg-violet-100 text-violet-600 border-2 border-violet-300" : "bg-gray-50 text-slate-400 border-2 border-gray-200"}`}>
          {recurring ? "🔁 Repeats weekly" : "One-off (tap for weekly)"}
        </button>
      </div>

      <button onClick={handleSave} className="w-full mt-5 py-3.5 rounded-xl bg-violet-600 text-white text-sm font-bold active:bg-violet-700 transition-all shadow-md">
        Save Changes
      </button>

      {recurring ? (
        <div className="mt-3 mb-20 flex flex-col gap-2">
          <button
            onClick={() => {
              if (occurrenceCancelled || confirm(`Cancel just the ${occurrenceDate} occurrence? It'll show struck-through — the rest of the weekly series stays.`)) handleToggleOccurrenceCancel();
            }}
            className="w-full py-3 rounded-xl border-2 border-amber-200 text-amber-600 text-sm font-bold active:bg-amber-50 transition-all"
          >
            {occurrenceCancelled ? "Un-cancel this occurrence" : "Cancel this occurrence only"}
          </button>
          <button
            onClick={() => {
              if (seriesCancelled || confirm("Cancel the entire weekly series? Every occurrence shows struck-through, nothing is deleted.")) handleToggleSeriesCancel();
            }}
            className="w-full py-3 rounded-xl border-2 border-amber-200 text-amber-600 text-sm font-bold active:bg-amber-50 transition-all"
          >
            {seriesCancelled ? "Un-cancel entire series" : "Cancel entire series"}
          </button>
          <button
            onClick={() => { if (confirm("Delete the entire weekly series? This removes every occurrence, past and future.")) handleDelete(); }}
            className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 text-sm font-bold active:bg-red-50 transition-all"
          >
            Delete entire series
          </button>
        </div>
      ) : (
        <div className="mt-3 mb-20 flex flex-col gap-2">
          <button
            onClick={() => {
              if (seriesCancelled || confirm("Cancel this activity? It'll show struck-through instead of being deleted.")) handleToggleSeriesCancel();
            }}
            className="w-full py-3 rounded-xl border-2 border-amber-200 text-amber-600 text-sm font-bold active:bg-amber-50 transition-all"
          >
            {seriesCancelled ? "Un-cancel Activity" : "Cancel Activity"}
          </button>
          <button onClick={handleDelete} className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 text-sm font-bold active:bg-red-50 transition-all">
            Delete Activity
          </button>
        </div>
      )}
    </div>
  );
}
