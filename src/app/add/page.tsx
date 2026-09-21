"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addActivity, getChildren, getHelpers, Child } from "@/lib/family-store";
import { parseTranscriptLocally } from "@/lib/voice-parser";
import { resizeImageToJpeg } from "@/lib/image";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type DraftActivity = {
  key: number;
  childIds: string[];
  title: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  recurring: boolean;
  owner: string[];
  collector: string[];
  notes: string;
};

function emptyDraft(): DraftActivity {
  return { key: Date.now(), childIds: [], title: "", date: todayStr(), time: "10:00", duration: 60, location: "", recurring: false, owner: [], collector: [], notes: "" };
}

export default function AddActivityPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [helpers, setHelpers] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  const [drafts, setDrafts] = useState<DraftActivity[]>([emptyDraft()]);

  const [processing, setProcessing] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => { setChildren(getChildren()); setHelpers(getHelpers()); };
    refresh();
    setMounted(true);
    window.addEventListener("family-sync", refresh);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSpeechSupported(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
    return () => window.removeEventListener("family-sync", refresh);
  }, []);

  const updateDraft = (key: number, field: keyof DraftActivity, value: string | number | boolean | string[]) => {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, [field]: value } : d)));
  };

  const removeDraft = (key: number) => {
    setDrafts((prev) => {
      const next = prev.filter((d) => d.key !== key);
      return next.length ? next : [emptyDraft()];
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const draftsFromParsed = (activities: any[]): DraftActivity[] => {
    return activities
      .filter((a: { childId?: string; title?: string }) => a.childId || a.title)
      .map((a: { childId?: string; title?: string; date?: string; time?: string; durationMinutes?: number; location?: string }) => ({
        key: Date.now() + Math.random(),
        childIds: a.childId ? [a.childId] : [],
        title: a.title || "Activity",
        date: a.date || todayStr(),
        time: a.time || "10:00",
        duration: a.durationMinutes || 60,
        location: a.location || "",
        recurring: false,
        owner: [],
        collector: [],
        notes: "",
      }));
  };

  const fillFromVoice = async (text: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/parse-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, children: getChildren() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.activities?.length) {
          const parsed = draftsFromParsed(data.activities);
          if (parsed.length) { setDrafts(parsed); return true; }
        }
      }
    } catch {}
    const result = parseTranscriptLocally(text);
    if (result.activities?.length) {
      const parsed = draftsFromParsed(result.activities);
      if (parsed.length) { setDrafts(parsed); return true; }
    }
    return false;
  };

  const fillFromImage = async (file: File) => {
    setPhotoError("");
    setPhotoProcessing(true);
    try {
      const base64 = await resizeImageToJpeg(file);
      const res = await fetch("/api/parse-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType: "image/jpeg", children: getChildren() }),
      });
      const data = await res.json();
      if (data.activities?.length) {
        const parsed = draftsFromParsed(data.activities);
        if (parsed.length) { setDrafts(parsed); return; }
      }
      setPhotoError(data.message || "Couldn't find an activity in that photo — try adding it manually");
    } catch {
      setPhotoError("Couldn't read that photo — try again");
    } finally {
      setPhotoProcessing(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) fillFromImage(file);
  };

  const handleRecord = async () => {
    if (listening || processing) return;
    setVoiceError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setVoiceError("Microphone blocked — check your browser settings");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setVoiceError("Voice not supported on this browser"); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IE";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => { setListening(true); setVoiceError(""); };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      setListening(false);
      const text = event.results[0]?.[0]?.transcript?.trim() || "";
      if (!text) { setVoiceError("Didn't catch that — try again"); return; }
      setProcessing(true);
      fillFromVoice(text)
        .then((ok) => { if (!ok) setVoiceError("Couldn't understand that — try rephrasing or fill it in manually below"); })
        .finally(() => setProcessing(false));
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      setListening(false);
      const err = event?.error || "unknown";
      if (err === "no-speech") setVoiceError("No speech detected — tap and speak clearly");
      else if (err === "not-allowed") setVoiceError("Microphone blocked — check browser settings");
      else setVoiceError(`Voice error: ${err}`);
    };
    recognition.onend = () => setListening(false);
    try { recognition.start(); } catch { setVoiceError("Could not start — try refreshing"); }
  };

  const handleSaveAll = () => {
    const valid = drafts.filter((d) => d.childIds.length && d.title.trim() && d.date && d.time);
    if (!valid.length) return;
    for (const d of valid) {
      addActivity({
        childIds: d.childIds,
        title: d.title.trim(),
        date: d.date,
        time: d.time,
        durationMinutes: d.duration,
        location: d.location.trim() || undefined,
        recurring: d.recurring ? "weekly" : undefined,
        owner: d.owner.length ? d.owner : undefined,
        collector: d.collector.length ? d.collector : undefined,
        notes: d.notes.trim() || undefined,
      });
    }
    router.push("/");
  };

  const validCount = drafts.filter((d) => d.childIds.length && d.title.trim() && d.date && d.time).length;

  if (!mounted) return null;

  if (!children.length) {
    return (
      <div className="animate-fade-in py-12 text-center">
        <p className="mb-2 text-2xl">🙋</p>
        <h2 className="mb-1 text-lg font-bold text-slate-900">Add a family member first</h2>
        <p className="mx-auto mb-6 max-w-xs text-sm text-slate-500">
          Activities get assigned to a family member, so add at least one person before adding an activity.
        </p>
        <button
          onClick={() => router.push("/manage")}
          className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-md active:bg-violet-700"
        >
          Add a family member
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm font-medium text-slate-500 active:text-slate-700 mb-4 -ml-1">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back
      </button>

      <h2 className="text-xl font-bold text-slate-900 mb-1">Add Activities</h2>
      <p className="text-sm text-slate-400 mb-5">Say it, snap a photo, or fill it in below</p>

      <div className="mb-6">
        <div className="flex items-center justify-center gap-6 mb-3">
          {speechSupported && (
            <div className="flex flex-col items-center">
              <button type="button" onClick={handleRecord} disabled={listening || processing} className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-lg transition-all active:scale-95 ${listening ? "animate-pulse bg-red-500 text-white ring-4 ring-red-200" : processing ? "bg-amber-500 text-white animate-pulse" : "bg-violet-600 text-white"}`}>
                {listening ? "🎤" : processing ? "⏳" : "🎙"}
              </button>
              <p className="text-xs text-slate-400 mt-2">{listening ? "Listening…" : processing ? "Processing…" : "Tap to speak"}</p>
            </div>
          )}
          <div className="flex flex-col items-center">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={photoProcessing} className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-lg transition-all active:scale-95 ${photoProcessing ? "bg-amber-500 text-white animate-pulse" : "bg-violet-600 text-white"}`}>
              {photoProcessing ? "⏳" : "📷"}
            </button>
            <p className="text-xs text-slate-400 mt-2">{photoProcessing ? "Reading…" : "Add a photo"}</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
        {voiceError && <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600 font-medium text-center max-w-xs mx-auto">{voiceError}</div>}
        {photoError && <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600 font-medium text-center max-w-xs mx-auto">{photoError}</div>}
      </div>

      <div className="space-y-4">
        {drafts.map((draft, idx) => (
          <ActivityCard key={draft.key} draft={draft} index={idx} children={children} helpers={helpers} total={drafts.length} onUpdate={(field, value) => updateDraft(draft.key, field, value)} onRemove={() => removeDraft(draft.key)} />
        ))}
      </div>

      <button type="button" onClick={() => setDrafts((prev) => [...prev, emptyDraft()])} className="w-full mt-3 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-slate-400 active:bg-gray-50 transition-colors">+ Add another activity</button>

      <button onClick={handleSaveAll} disabled={!validCount} className="w-full mt-5 mb-4 py-3.5 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-30 active:bg-violet-700 transition-all shadow-md">
        {validCount > 1 ? `Save ${validCount} Activities` : "Save Activity"}
      </button>
    </div>
  );
}

function ActivityCard({ draft, index, children, helpers, total, onUpdate, onRemove }: {
  draft: DraftActivity; index: number; children: Child[]; helpers: string[]; total: number;
  onUpdate: (field: keyof DraftActivity, value: string | number | boolean | string[]) => void; onRemove: () => void;
}) {
  const [showCollector, setShowCollector] = useState(draft.collector.length > 0);
  const toggleOwner = (o: string) => {
    onUpdate("owner", draft.owner.includes(o) ? draft.owner.filter((x) => x !== o) : [...draft.owner, o]);
  };
  const toggleCollector = (o: string) => {
    onUpdate("collector", draft.collector.includes(o) ? draft.collector.filter((x) => x !== o) : [...draft.collector, o]);
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Activity {total > 1 ? index + 1 : ""}</span>
        {total > 1 && <button type="button" onClick={onRemove} className="text-xs font-semibold text-red-400 active:text-red-600">Remove</button>}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {children.map((child) => (
          <button key={child.id} type="button" onClick={() => onUpdate("childIds", draft.childIds.includes(child.id) ? draft.childIds.filter((x) => x !== child.id) : [...draft.childIds, child.id])} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${draft.childIds.includes(child.id) ? "ring-2 ring-violet-500 bg-white shadow" : "bg-gray-100 text-slate-500"}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full text-slate-700 text-[9px] font-black" style={{ backgroundColor: child.color }}>{child.initials}</span>
            {child.name}
          </button>
        ))}
      </div>
      {!draft.childIds.length && <p className="text-[10px] text-red-400 mb-2">Pick at least one family member</p>}

      <input type="text" value={draft.title} onChange={(e) => onUpdate("title", e.target.value)} placeholder="Activity name" className="w-full mb-3 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-violet-500 focus:outline-none text-sm" />

      <div className="flex gap-2 mb-3">
        <input type="date" value={draft.date} onChange={(e) => onUpdate("date", e.target.value)} className="flex-1 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 focus:border-violet-500 focus:outline-none text-sm" />
        <input type="time" value={draft.time} onChange={(e) => onUpdate("time", e.target.value)} className="w-24 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 focus:border-violet-500 focus:outline-none text-sm" />
      </div>

      <div className="flex gap-1.5 mb-3">
        {[30, 60, 90, 120].map((mins) => (
          <button key={mins} type="button" onClick={() => onUpdate("duration", mins)} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${draft.duration === mins ? "bg-violet-600 text-white shadow" : "bg-gray-100 text-slate-400"}`}>
            {mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}`}
          </button>
        ))}
      </div>

      <input type="text" value={draft.location} onChange={(e) => onUpdate("location", e.target.value)} placeholder="Location (optional)" className="w-full mb-3 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-violet-500 focus:outline-none text-sm" />

      {/* Owner picker */}
      <div className="mb-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">🚗 Who&apos;s bringing them? (pick any that apply)</p>
        <div className="flex flex-wrap gap-1.5">
          {helpers.map((o) => (
            <button key={o} type="button" onClick={() => toggleOwner(o)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${draft.owner.includes(o) ? "bg-pink-500 text-white shadow" : "bg-gray-100 text-slate-400"}`}>
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* Collector (collapsed unless different from who's bringing them) */}
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
              <button key={o} type="button" onClick={() => toggleCollector(o)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${draft.collector.includes(o) ? "bg-pink-500 text-white shadow" : "bg-gray-100 text-slate-400"}`}>
                {o}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <textarea
        value={draft.notes}
        onChange={(e) => onUpdate("notes", e.target.value)}
        placeholder="Notes (optional) — e.g. bring shin pads, entrance around the back"
        rows={2}
        className="w-full mb-3 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-violet-500 focus:outline-none text-sm resize-none"
      />

      {/* Recurring toggle */}
      <button type="button" onClick={() => onUpdate("recurring", !draft.recurring)} className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${draft.recurring ? "bg-violet-100 text-violet-600 border-2 border-violet-300" : "bg-gray-50 text-slate-400 border-2 border-gray-200"}`}>
        {draft.recurring ? "🔁 Repeats weekly" : "One-off (tap for weekly)"}
      </button>
    </div>
  );
}
