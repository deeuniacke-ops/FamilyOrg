"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Child, FamilyActivity, addActivities, getChildren } from "@/lib/family-store";
import { resizeImageToJpeg } from "@/lib/image";
import { showToast } from "@/components/Toast";

type Closure = {
  key: number;
  label: string;
  startDate: string;
  endDate: string;
  checked: boolean;
  days: string[] | null; // null = invalid/too long range, can't be added
};

const MAX_RANGE_DAYS = 90;

function expandRange(startDate: string, endDate: string): string[] | null {
  const start = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(cursor.getFullYear() + "-" + String(cursor.getMonth() + 1).padStart(2, "0") + "-" + String(cursor.getDate()).padStart(2, "0"));
    cursor.setDate(cursor.getDate() + 1);
    if (days.length > MAX_RANGE_DAYS) return null;
  }
  return days;
}

function formatRange(startDate: string, endDate: string): string {
  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return startDate === endDate ? fmt(startDate) : `${fmt(startDate)} – ${fmt(endDate)}`;
}

let nextClosureKey = 0;

export default function SchoolCalendarPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"children" | "upload" | "review">("children");
  const [childIds, setChildIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [closures, setClosures] = useState<Closure[]>([]);
  const [parseMessage, setParseMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setChildren(getChildren());
    setMounted(true);
    const refresh = () => setChildren(getChildren());
    window.addEventListener("family-sync", refresh);
    return () => window.removeEventListener("family-sync", refresh);
  }, []);

  const toggleChild = (id: string) => {
    setChildIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError("");
    setProcessing(true);
    try {
      const base64 = await resizeImageToJpeg(file, 2000);
      const res = await fetch("/api/parse-school-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType: "image/jpeg" }),
      });
      const data = await res.json();
      setParseMessage(data.message || "");
      if (data.closures?.length) {
        const parsed: Closure[] = data.closures.map((c: { label?: string; startDate?: string; endDate?: string }) => {
          const days = c.startDate && c.endDate ? expandRange(c.startDate, c.endDate) : null;
          return {
            key: nextClosureKey++,
            label: c.label || "Closure",
            startDate: c.startDate || "",
            endDate: c.endDate || "",
            checked: !!days,
            days,
          };
        });
        setClosures(parsed);
        setStep("review");
      } else {
        setPhotoError(data.message || "Couldn't find any closures in that photo — try again or a clearer photo");
      }
    } catch {
      setPhotoError("Couldn't read that photo — try again");
    } finally {
      setProcessing(false);
    }
  };

  const toggleClosure = (key: number) => {
    setClosures((prev) => prev.map((c) => (c.days && c.key === key ? { ...c, checked: !c.checked } : c)));
  };

  const allChecked = closures.every((c) => !c.days || c.checked);
  const setAll = (checked: boolean) => {
    setClosures((prev) => prev.map((c) => (c.days ? { ...c, checked } : c)));
  };

  const selectedCount = closures.filter((c) => c.checked && c.days).length;

  const handleConfirm = () => {
    const toAdd = closures.filter((c) => c.checked && c.days);
    const inputs: Omit<FamilyActivity, "id">[] = toAdd.flatMap((c) =>
      c.days!.map((date) => ({
        childIds,
        title: c.label,
        date,
        time: "00:00",
        durationMinutes: 1440,
        allDay: true,
      }))
    );
    addActivities(inputs);
    showToast(`${inputs.length} closure day${inputs.length === 1 ? "" : "s"} added`, "info");
    router.push("/manage");
  };

  if (!mounted) return null;

  if (!children.length) {
    return (
      <div className="animate-fade-in py-12 text-center">
        <p className="mb-2 text-2xl">🙋</p>
        <h2 className="mb-1 text-lg font-bold text-slate-900">Add a family member first</h2>
        <p className="mx-auto mb-6 max-w-xs text-sm text-slate-500">
          Closures get assigned to family members, so add at least one person before uploading a school calendar.
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
      <button
        onClick={() => (step === "children" ? router.back() : setStep(step === "review" ? "upload" : "children"))}
        className="flex items-center gap-1 text-sm font-medium text-slate-500 active:text-slate-700 mb-4 -ml-1"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back
      </button>

      <h2 className="text-xl font-bold text-slate-900 mb-1">Upload School Calendar</h2>
      <p className="text-sm text-slate-400 mb-5">
        {step === "children" && "Who does this school's calendar apply to?"}
        {step === "upload" && "Take a photo of the school's yearly calendar"}
        {step === "review" && "Review what was found — untick anything you don't want"}
      </p>

      {step === "children" && (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {children.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => toggleChild(child.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${childIds.includes(child.id) ? "ring-2 ring-violet-500 bg-white shadow" : "bg-gray-100 text-slate-500"}`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-slate-700 text-[9px] font-black" style={{ backgroundColor: child.color }}>{child.initials}</span>
                {child.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!childIds.length}
            onClick={() => setStep("upload")}
            className="w-full py-3.5 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-30 active:bg-violet-700 transition-all shadow-md"
          >
            Continue
          </button>
        </>
      )}

      {step === "upload" && (
        <div className="mb-6 flex flex-col items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={processing}
            className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-lg transition-all active:scale-95 ${processing ? "bg-amber-500 text-white animate-pulse" : "bg-violet-600 text-white"}`}
          >
            {processing ? "⏳" : "📷"}
          </button>
          <p className="text-xs text-slate-400 mt-2">{processing ? "Reading…" : "Take or choose a photo"}</p>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          {photoError && <div className="mt-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600 font-medium text-center max-w-xs mx-auto">{photoError}</div>}
        </div>
      )}

      {step === "review" && (
        <>
          {parseMessage && <div className="mb-4 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700 font-medium">{parseMessage}</div>}
          <button type="button" onClick={() => setAll(!allChecked)} className="mb-3 text-xs font-bold text-violet-500">
            {allChecked ? "Deselect all" : "Select all"}
          </button>
          <div className="flex flex-col gap-2 mb-6">
            {closures.map((c) => (
              <label key={c.key} className={`flex items-start gap-3 rounded-xl border p-3 ${c.days ? "border-gray-200 bg-white" : "border-red-100 bg-red-50"}`}>
                <input type="checkbox" checked={c.checked} disabled={!c.days} onChange={() => toggleClosure(c.key)} className="mt-1 h-4 w-4 accent-violet-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{c.label}</p>
                  <p className="text-xs text-slate-500">{c.startDate && c.endDate ? formatRange(c.startDate, c.endDate) : "Unknown dates"}</p>
                  {!c.days && <p className="text-[10px] font-bold text-red-500 mt-1">Range looks invalid — skipped</p>}
                </div>
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={!selectedCount}
            onClick={handleConfirm}
            className="w-full py-3.5 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-30 active:bg-violet-700 transition-all shadow-md mb-20"
          >
            {selectedCount ? `Add ${selectedCount} closure${selectedCount === 1 ? "" : "s"}` : "Nothing selected"}
          </button>
        </>
      )}
    </div>
  );
}
