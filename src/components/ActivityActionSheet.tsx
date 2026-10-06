"use client";

import { FamilyActivity } from "@/lib/family-store";

export default function ActivityActionSheet({
  activity,
  onCancel,
  onDelete,
  onClose,
}: {
  activity: FamilyActivity;
  onCancel: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const isRecurring = activity.recurring === "weekly";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 pb-8 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <p className="mb-4 truncate text-sm font-black text-slate-800">{activity.title}</p>
        <div className="flex flex-col gap-2">
          <button onClick={onCancel} className="w-full py-3 rounded-xl border-2 border-amber-200 text-amber-600 text-sm font-bold active:bg-amber-50 transition-all">
            {activity.cancelled ? "Un-cancel" : "Cancel"} {isRecurring ? "this occurrence" : "activity"}
          </button>
          <button onClick={onDelete} className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 text-sm font-bold active:bg-red-50 transition-all">
            Delete {isRecurring ? "entire series" : "activity"}
          </button>
          <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-bold text-slate-400 active:bg-gray-50 transition-all">
            Nothing, go back
          </button>
        </div>
      </div>
    </div>
  );
}
