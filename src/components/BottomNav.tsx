"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const path = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur">
      <div
        className="mx-auto flex max-w-lg items-end justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Activities */}
        <Link
          href="/"
          className={`flex min-w-0 flex-1 flex-col items-center py-2 text-xs font-bold ${
            path === "/" ? "text-violet-500" : "text-slate-400"
          }`}
        >
          <span className="text-xl leading-5">⌂</span>
          <span className="mt-0.5 truncate">Activities</span>
        </Link>

        {/* Add — raised + button */}
        <Link
          href="/add"
          className="relative -mt-7 flex min-w-0 flex-1 flex-col items-center"
        >
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-full text-3xl font-bold shadow-lg transition-all active:scale-95 ${
              path === "/add"
                ? "bg-violet-600 text-white ring-2 ring-violet-300"
                : "bg-violet-500 text-white"
            }`}
          >
            +
          </span>
          <span className="mt-1 text-xs font-bold text-violet-500">Add</span>
        </Link>

        {/* Family */}
        <Link
          href="/manage"
          className={`flex min-w-0 flex-1 flex-col items-center py-2 text-xs font-bold ${
            path === "/manage" ? "text-violet-500" : "text-slate-400"
          }`}
        >
          <span className="text-xl leading-5">●</span>
          <span className="mt-0.5 truncate">Family</span>
        </Link>
      </div>
    </nav>
  );
}
