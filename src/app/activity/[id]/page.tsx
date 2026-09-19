"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { getActivities, getChildren, getHelpers, updateActivity, removeActivity, Child, FamilyActivity } from "@/lib/family-store";

function timeLabel(time: string) {
  return new Date(`1970-01-01T${time}:00`).toLocaleTimeString("en-IE", { hour: "numeric", minute: "2-digit" });
}

export default function ActivityEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [helpers, setHelpers] = useState<string[]>([]);
  const [activity, setActivity] = useState<FamilyActivity | null>(null);
  const [mounted, setMounted] = useState(false);

  // Editable fields
  const [childId, setChildId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [owner, setOwner] = useState<string[]>([]);
  const [collector, setCollector] = useState<string[]>([]);
  const [showCollector, setShowCollector] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const kids = getChildren();
    setChildren(kids);
    setHelpers(getHelpers());
    const all = getActivities();
    const found = all.find((a) => a.id === id);
    if (found) {
      setActivity(found);
      setChildId(found.childId);
      setTitle(found.title);
      setDate(found.date);
      setTime(found.time);
      setDuration(found.durationMinutes);
      setLocation(found.location || "");
      setRecurring(found.recurring === "weekly");
      setOwner(found.owner || []);
      setCollector(found.collector || []);
      setShowCollector(!!found.collector?.length);
      setNotes(found.notes || "");
    }
    setMounted(true);
    const refreshChildren = () => { setChildren(getChildren()); setHelpers(getHelpers()); };
    window.addEventListener("family-sync", refreshChildren);
    return () => window.removeEventListener("family-sync", refreshChildren);
  }, [id]);

  const handleSave = () => {
    if (!childId || !title.trim() || !date || !time) return;
    updateActivity(id, {
      childId,
      title: title.trim(),
      date,
      time,
      durationMinutes: duration,
      location: location.trim() || undefined,
      recurring: recurring ? "weekly" : undefined,
      owner: owner.length ? owner : undefined,
      collector: collector.length ? collector : undefined,
      notes: notes.trim() || undefined,
    });
    router.back();
  };

  const handleDelete = () => {
    removeActivity(id);
    router.push("/");
  };

  if (!mounted) return null;
  if (!activity) return (
    <div className="animate-fade-in py-16 text-center">
      <p className="text-slate-400 text-sm">Activity not found</p>
      <button onClick={() => router.back()} className="mt-4 text-violet-600 text-sm font-bold">Go back</button>
    </div>
  );

  const child = children.find((c) => c.id === activity.childId);

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm font-medium text-slate-500 active:text-slate-700 mb-4 -ml-1">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back
      </button>

      <h2 className="text-xl font-bold text-slate-900 mb-1">Edit Activity</h2>
      <p className="text-sm text-slate-400 mb-5">
        {child?.name} · {timeLabel(activity.time)} · {activity.date}
      </p>

      <div className="rounded-2xl border-2 border-gray-100 bg-white p-4 shadow-card">
        {/* Family member picker */}
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Family Member</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {children.map((c) => (
            <button key={c.id} type="button" onClick={() => setChildId(c.id)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${childId === c.id ? "ring-2 ring-violet-500 bg-white shadow" : "bg-gray-100 text-slate-500"}`}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: c.color }}>{c.initials}</span>
              {c.name}
            </button>
          ))}
        </div>

        {/* Title */}
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Activity name" className="w-full mb-3 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-violet-500 focus:outline-none text-sm" />

        {/* Date + time */}
        <div className="flex gap-2 mb-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 focus:border-violet-500 focus:outline-none text-sm" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-24 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 focus:border-violet-500 focus:outline-none text-sm" />
        </div>

        {/* Duration chips */}
        <div className="flex gap-1.5 mb-3">
          {[30, 60, 90, 120].map((mins) => (
            <button key={mins} type="button" onClick={() => setDuration(mins)} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${duration === mins ? "bg-violet-600 text-white shadow" : "bg-gray-100 text-slate-400"}`}>
              {mins < 60 ? `${mins}m` : `${mins / 60}h${mins % 60 ? ` ${mins % 60}m` : ""}`}
            </button>
          ))}
        </div>

        {/* Location */}
        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" className="w-full mb-3 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-violet-500 focus:outline-none text-sm" />

        {/* Owner picker */}
        <div className="mb-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">🚗 Who&apos;s bringing them? (pick any that apply)</p>
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

      <button onClick={handleDelete} className="w-full mt-3 mb-20 py-3 rounded-xl border-2 border-red-200 text-red-500 text-sm font-bold active:bg-red-50 transition-all">
        Delete Activity
      </button>
    </div>
  );
}
