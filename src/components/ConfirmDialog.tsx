"use client";

/** In-app replacement for window.confirm() - the browser's native dialog
 *  always prefixes the message with the page's origin ("example.com
 *  says…") as an anti-spoofing measure, which can't be removed or
 *  customized from JS. This gives full control over the wording instead. */
export default function ConfirmDialog({
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50" onClick={onCancel}>
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 pb-8 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <p className="mb-4 text-sm font-semibold text-slate-700">{message}</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className={`w-full py-3 rounded-xl text-sm font-bold text-white transition-all ${danger ? "bg-red-500 active:bg-red-600" : "bg-violet-600 active:bg-violet-700"}`}
          >
            {confirmLabel}
          </button>
          <button onClick={onCancel} className="w-full py-3 rounded-xl text-sm font-bold text-slate-400 active:bg-gray-50 transition-all">
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
