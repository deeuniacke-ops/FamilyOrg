"use client";

import { useEffect, useMemo, useState } from "react";
import { getActivitiesForDates } from "@/lib/family-store";

function pad(n: number) { return String(n).padStart(2, "0"); }
function dateKey(year: number, month: number, day: number) { return `${year}-${pad(month + 1)}-${pad(day)}`; }
function daysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
/** Monday-first weekday index (0 = Mon .. 6 = Sun) for the 1st of the month */
function firstWeekdayOfMonth(year: number, month: number) { return (new Date(year, month, 1).getDay() + 6) % 7; }

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function MonthCalendar({
  selectedDate,
  onSelectDate,
  onClose,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onClose: () => void;
}) {
  const [year, month, day] = selectedDate.split("-").map(Number);
  const [viewYear, setViewYear] = useState(year);
  const [viewMonth, setViewMonth] = useState(month - 1);
  const [activeDates, setActiveDates] = useState<Map<string, number>>(new Map());

  const todayKey = useMemo(() => {
    const t = new Date();
    return dateKey(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);

  useEffect(() => {
    const numDays = daysInMonth(viewYear, viewMonth);
    const dates = Array.from({ length: numDays }, (_, i) => dateKey(viewYear, viewMonth, i + 1));
    const activities = getActivitiesForDates(dates).filter((a) => !a.cancelled);
    const counts = new Map<string, number>();
    for (const a of activities) counts.set(a.date, (counts.get(a.date) || 0) + 1);
    setActiveDates(counts);
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-IE", { month: "long", year: "numeric" });
  const leadingBlanks = firstWeekdayOfMonth(viewYear, viewMonth);
  const numDays = daysInMonth(viewYear, viewMonth);
  // Fixed 6 rows always, so the grid's height (and everything below it)
  // doesn't shift as you page between shorter and longer months.
  const trailingBlanks = 42 - leadingBlanks - numDays;
  const selectedKey = dateKey(year, month - 1, day);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 pb-8 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <button aria-label="Previous month" onClick={goPrevMonth} className="h-8 w-8 rounded-lg text-lg font-bold text-slate-500 active:bg-gray-100">‹</button>
          <p className="text-sm font-black text-slate-800">{monthLabel}</p>
          <button aria-label="Next month" onClick={goNextMonth} className="h-8 w-8 rounded-lg text-lg font-bold text-slate-500 active:bg-gray-100">›</button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={i} className="text-center text-[10px] font-bold uppercase text-slate-400">{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: numDays }, (_, i) => i + 1).map((d) => {
            const key = dateKey(viewYear, viewMonth, d);
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const count = activeDates.get(key) || 0;
            return (
              <button
                key={key}
                onClick={() => { onSelectDate(key); onClose(); }}
                className="flex flex-col items-center gap-0.5 py-1.5"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    isSelected
                      ? "bg-violet-600 text-white"
                      : isToday
                      ? "border-2 border-violet-400 text-violet-600"
                      : "text-slate-700"
                  }`}
                >
                  {d}
                </span>
                {count > 0 ? (
                  <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-violet-500 px-1 text-[9px] font-bold leading-none text-white">
                    {count}
                  </span>
                ) : (
                  <span className="h-3.5 w-3.5" />
                )}
              </button>
            );
          })}
          {Array.from({ length: trailingBlanks }).map((_, i) => <div key={`t${i}`} />)}
        </div>
      </div>
    </div>
  );
}
