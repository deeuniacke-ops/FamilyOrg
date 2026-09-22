"use client";

import { useRouter } from "next/navigation";
import { FEATURES } from "@/lib/features";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.back()} className="mb-4 -ml-1 flex items-center gap-1 text-sm font-medium text-slate-500 active:text-slate-700">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back
      </button>

      <div className="mb-8 text-center">
        <h1 className="mb-2 text-4xl font-black tracking-tight text-violet-600">Clann</h1>
        <p className="mx-auto max-w-xs text-base font-bold text-slate-700">
          One shared calendar for everyone&apos;s activities
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">
              {f.icon}
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900">{f.title}</h3>
              <p className="text-xs text-slate-500">{f.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-20" />
    </div>
  );
}
