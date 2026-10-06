"use client";

import { useEffect, useRef, useState } from "react";

export default function SearchBar({ value, onChange, placeholder = "Search activities…" }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => { setOpen(false); onChange(""); };
  const openSearch = () => {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="flex items-center justify-end">
      <div
        className="flex items-center gap-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 ease-out"
        style={{ width: open ? "100%" : 36, paddingInline: open ? 12 : 0 }}
      >
        <button
          aria-label={open ? "Search" : "Open search"}
          onClick={openSearch}
          className="flex h-9 w-9 shrink-0 items-center justify-center text-base text-slate-500"
        >
          🔍
        </button>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => { if (!value) close(); }}
          placeholder={placeholder}
          className={`min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none transition-opacity duration-150 ${open ? "opacity-100" : "opacity-0"}`}
        />
        {open && value && (
          <button aria-label="Clear search" onClick={() => onChange("")} className="shrink-0 text-slate-400 font-bold">✕</button>
        )}
      </div>
    </div>
  );
}
