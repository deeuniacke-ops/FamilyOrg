"use client";

import { AvailabilityStatus } from "@/lib/types";

type Props = {
  current: AvailabilityStatus;
  onSelect: (status: AvailabilityStatus) => void;
  size?: "default" | "compact";
};

const options: { status: AvailabilityStatus; label: string; icon: string; color: string; bgActive: string; ring: string }[] = [
  {
    status: "available",
    label: "I'm In",
    icon: "✓",
    color: "text-green-700",
    bgActive: "bg-green-50 border-green-500",
    ring: "ring-green-200",
  },
  {
    status: "unavailable",
    label: "Can't Make It",
    icon: "✕",
    color: "text-red-600",
    bgActive: "bg-red-50 border-red-500",
    ring: "ring-red-200",
  },
  {
    status: "maybe",
    label: "Maybe",
    icon: "?",
    color: "text-amber-600",
    bgActive: "bg-amber-50 border-amber-500",
    ring: "ring-amber-200",
  },
];

export default function AvailabilityPicker({ current, onSelect, size = "default" }: Props) {
  const isCompact = size === "compact";

  return (
    <div className={`flex gap-2 ${isCompact ? "" : "gap-3"}`}>
      {options.map((opt) => {
        const isActive = current === opt.status;

        return (
          <button
            key={opt.status}
            onClick={() => onSelect(isActive ? null : opt.status)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 rounded-xl border-2 font-semibold
              transition-all duration-150 active:animate-press select-none
              ${isCompact ? "py-2 text-sm" : "py-3 text-base"}
              ${
                isActive
                  ? `${opt.bgActive} ${opt.color} ring-2 ${opt.ring}`
                  : "bg-white border-gray-200 text-slate-500 hover:border-gray-300"
              }
            `}
          >
            <span className={`${isCompact ? "text-sm" : "text-lg"} font-bold`}>
              {opt.icon}
            </span>
            {!isCompact && <span>{opt.label}</span>}
            {isCompact && <span>{opt.status === "available" ? "In" : opt.status === "unavailable" ? "Out" : "?"}</span>}
          </button>
        );
      })}
    </div>
  );
}
