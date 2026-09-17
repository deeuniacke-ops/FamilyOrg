"use client";

import { useEffect, useState, useCallback } from "react";

interface ToastMessage {
  id: number;
  text: string;
  type: "error" | "warning" | "info";
}

let nextId = 0;

export function showToast(text: string, type: "error" | "warning" | "info" = "error") {
  window.dispatchEvent(
    new CustomEvent("cluichi-toast", { detail: { id: nextId++, text, type } })
  );
}

export default function Toast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent).detail as ToastMessage;
      setMessages((prev) => [...prev.slice(-2), msg]); // keep max 3
      setTimeout(() => dismiss(msg.id), 5000);
    };
    window.addEventListener("cluichi-toast", handler);
    return () => window.removeEventListener("cluichi-toast", handler);
  }, [dismiss]);

  if (messages.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`pointer-events-auto rounded-xl px-4 py-3 shadow-lg text-sm font-medium flex items-center gap-2 animate-fade-in ${
            msg.type === "error"
              ? "bg-red-500 text-white"
              : msg.type === "warning"
              ? "bg-amber-500 text-white"
              : "bg-slate-700 text-white"
          }`}
          onClick={() => dismiss(msg.id)}
        >
          <span>{msg.type === "error" ? "⚠️" : msg.type === "warning" ? "🔄" : "ℹ️"}</span>
          <span className="flex-1">{msg.text}</span>
          <span className="text-white/60 text-xs">tap to dismiss</span>
        </div>
      ))}
    </div>
  );
}
