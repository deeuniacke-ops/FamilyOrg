"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addActivity, getChildren, Child } from "@/lib/family-store";
import { parseTranscriptLocally } from "@/lib/voice-parser";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const OWNERS = ["Mum", "Dad", "Nana", "Grandad", "Carpool"];

type DraftActivity = {
  key: number;
  childId: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  recurring: boolean;
  owner: string;
};

function emptyDraft(): DraftActivity {
  return { key: Date.now(), childId: "", title: "", date: todayStr(), time: "10:00", duration: 60, location: "", recurring: false, owner: "" };
}

export default function AddActivityPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [mounted, setMounted] = useState(false);

  const [drafts, setDrafts] = useState<DraftActivity[]>([emptyDraft()]);

  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");

  useEffect(() => {
    setChildren(getChildren());
    setMounted(true);
  }, []);

  const updateDraft = (key: number, field: keyof DraftActivity, value: string | number | boolean) => {
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
        childId: a.childId || "",
        title: a.title || "Activity",
        date: a.date || todayStr(),
        time: a.time || "10:00",
        duration: a.durationMinutes || 60,
        location: a.location || "",
        recurring: false,
        owner: "",
      }));
  };

  const fillFromVoice = async (text: string) => {
    setTranscript(text);
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
          if (parsed.length) { setDrafts(parsed); return; }
        }
      }
    } catch {}
    const result = parseTranscriptLocally(text);
    if (result.activities?.length) {
      const parsed = draftsFromParsed(result.activities);
      if (parsed.length) { setDrafts(parsed); return; }
    }
  };

  const handleRecord = async () => {
    if (listening || processing) return;
    setVoiceError("");
    setTranscript("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setVoiceError("Microphone blocked — tap the 🔒 in your address bar to allow");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setVoiceError("Voice not supported — use Chrome"); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IE";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => { setListening(true); setVoiceError(""); };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      setListening(false);
      const text = event.results[0]?.[0]?.transcript?.trim() || "";
      if (text) { setProcessing(true); fillFromVoice(text).finally(() => setProcessing(false)); }
      else setVoiceError("Didn't catch that — try again");
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
    const valid = drafts.filter((d) => d.childId && d.title.trim() && d.date && d.time);
    if (!valid.length) return;
    for (const d of valid) {
      addActivity({
        childId: d.childId,
        title: d.title.trim(),
        date: d.date,
        time: d.time,
        durationMinutes: d.duration,
        location: d.location.trim() || undefined,
        recurring: d.recurring ? "weekly" : undefined,
        owner: d.owner.trim() || undefined,
      });
    }
    router.push("/");
  };

  const validCount = drafts.filter((d) => d.childId && d.title.trim() && d.date && d.time).length;

  if (!mounted) return null;

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm font-medium text-slate-500 active:text-slate-700 mb-4 -ml-1">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back
      </button>

      <h2 className="text-xl font-bold text-slate-900 mb-1">Add Activities</h2>
      <p className="text-sm text-slate-400 mb-5">Use voice or type it in</p>

      <div className="flex flex-col items-center mb-6">
        <button type="button" onClick={handleRecord} disabled={listening || processing} className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-lg transition-all active:scale-95 ${listening ? "animate-pulse bg-red-500 text-white ring-4 ring-red-200" : processing ? "bg-amber-500 text-white animate-pulse" : "bg-gradient-to-r from-violet-600 via-pink-500 to-amber-400 text-white"}`}>
          {listening ? "🎤" : processing ? "⏳" : "🎙"}
        </button>
        <p className="text-xs text-slate-400 mt-2">{listening ? "Listening… speak now" : processing ? "Processing…" : "Tap to speak"}</p>
        {transcript && <div className="mt-2 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 text-xs text-violet-700 font-medium text-center max-w-xs">&ldquo;{transcript}&rdquo;</div>}
        {voiceError && <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600 font-medium text-center max-w-xs">{voiceError}</div>}
      </div>

      <div className="space-y-4">
        {drafts.map((draft, idx) => (
          <ActivityCard key={draft.key} draft={draft} index={idx} children={children} total={drafts.length} onUpdate={(field, value) => updateDraft(draft.key, field, value)} onRemove={() => removeDraft(draft.key)} />
        ))}
      </div>

      <button type="button" onClick={() => setDrafts((prev) => [...prev, emptyDraft()])} className="w-full mt-3 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-slate-400 active:bg-gray-50 transition-colors">+ Add another activity</button>

      <button onClick={handleSaveAll} disabled={!validCount} className="w-full mt-5 mb-4 py-3.5 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-30 active:bg-violet-700 transition-all shadow-md">
        {validCount > 1 ? `Save ${validCount} Activities` : "Save Activity"}
      </button>
    </div>
  );
}

function ActivityCard({ draft, index, children, total, onUpdate, onRemove }: {
  draft: DraftActivity; index: number; children: Child[]; total: number;
  onUpdate: (field: keyof DraftActivity, value: string | number | boolean) => void; onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-gray-100 bg-white p-4 shadow-card animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Activity {total > 1 ? index + 1 : ""}</span>
        {total > 1 && <button type="button" onClick={onRemove} className="text-xs font-semibold text-red-400 active:text-red-600">Remove</button>}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {children.map((child) => (
          <button key={child.id} type="button" onClick={() => onUpdate("childId", child.id)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${draft.childId === child.id ? "ring-2 ring-violet-500 bg-white shadow" : "bg-gray-100 text-slate-500"}`}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: child.color }}>{child.initials}</span>
            {child.name}
          </button>
        ))}
      </div>
      {!draft.childId && <p className="text-[10px] text-red-400 mb-2">Pick a child</p>}

      <input type="text" value={draft.title} onChange={(e) => onUpdate("title", e.target.value)} placeholder="Activity name" className="w-full mb-3 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-violet-500 focus:outline-none text-sm" />

      <div className="flex gap-2 mb-3">
        <input type="date" value={draft.date} onChange={(e) => onUpdate("date", e.target.value)} className="flex-1 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 focus:border-violet-500 focus:outline-none text-sm" />
        <input type="time" value={draft.time} onChange={(e) => onUpdate("time", e.target.value)} className="w-24 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 focus:border-violet-500 focus:outline-none text-sm" />
      </div>

      <div className="flex gap-1.5 mb-3">
        {[30, 60, 90, 120].map((mins) => (
          <button key={mins} type="button" onClick={() => onUpdate("duration", mins)} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${draft.duration === mins ? "bg-violet-600 text-white shadow" : "bg-gray-100 text-slate-400"}`}>
            {mins < 60 ? `${mins}m` : `${mins / 60}h${mins % 60 ? ` ${mins % 60}m` : ""}`}
          </button>
        ))}
      </div>

      <input type="text" value={draft.location} onChange={(e) => onUpdate("location", e.target.value)} placeholder="Location (optional)" className="w-full mb-3 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-violet-500 focus:outline-none text-sm" />

      {/* Owner picker */}
      <div className="mb-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Who&apos;s bringing them?</p>
        <div className="flex flex-wrap gap-1.5">
          {OWNERS.map((o) => (
            <button key={o} type="button" onClick={() => onUpdate("owner", draft.owner === o ? "" : o)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${draft.owner === o ? "bg-pink-500 text-white shadow" : "bg-gray-100 text-slate-400"}`}>
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* Recurring toggle */}
      <button type="button" onClick={() => onUpdate("recurring", !draft.recurring)} className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${draft.recurring ? "bg-violet-100 text-violet-600 border-2 border-violet-300" : "bg-gray-50 text-slate-400 border-2 border-gray-200"}`}>
        {draft.recurring ? "🔁 Repeats weekly" : "One-off (tap for weekly)"}
      </button>
    </div>
  );
}
