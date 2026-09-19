"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { addActivity, getChildren } from "@/lib/family-store";
import { parseTranscriptLocally } from "@/lib/voice-parser";

export default function VoiceRecordButton() {
  const router = useRouter();
  const path = usePathname();
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const showMessage = (text: string, error = false) => {
    setMessage(text);
    setIsError(error);
    if (!error) setTimeout(() => setMessage(""), 3000);
  };

  const createFromAPI = async (transcript: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/parse-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, children: getChildren() }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.error || !data.activities?.length) return false;

      let created = 0;
      for (const a of data.activities) {
        if (a.childId && a.date && a.time) {
          addActivity({
            childId: a.childId,
            title: a.title || "Activity",
            date: a.date,
            time: a.time,
            durationMinutes: a.durationMinutes || 60,
            location: a.location,
            notes: a.notes,
          });
          created++;
        }
      }
      if (created > 0) {
        showMessage(data.message || `Added ${created} activit${created === 1 ? "y" : "ies"} ✓`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const createFromLocal = (transcript: string): boolean => {
    const result = parseTranscriptLocally(transcript);
    if (!result.ok) return false;

    let created = 0;
    for (const a of result.activities) {
      if (a.childId && a.date && a.time) {
        addActivity({
          childId: a.childId,
          title: a.title || "Activity",
          date: a.date,
          time: a.time,
          durationMinutes: a.durationMinutes || 60,
        });
        created++;
      }
    }
    if (created > 0) {
      showMessage(result.message + " ✓");
      return true;
    }
    return false;
  };

  const handleRecord = () => {
    if (listening || processing) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showMessage("Voice not supported on this browser", true);
      return;
    }

    setMessage("");
    setIsError(false);

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IE";
    recognition.continuous = false;      // auto-stops after silence
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setMessage("Listening…");
      setIsError(false);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (!transcript) {
        setListening(false);
        showMessage("Didn't catch that. Try again.", true);
        return;
      }

      setListening(false);
      setProcessing(true);
      setMessage(`"${transcript}"`);

      // Try Claude API first, then fall back to local parser
      const apiSuccess = await createFromAPI(transcript);
      if (!apiSuccess) {
        const localSuccess = createFromLocal(transcript);
        if (!localSuccess) {
          setProcessing(false);
          showMessage(`Heard: "${transcript}" — say the child's name, the day and the time`, true);
          return;
        }
      }

      setProcessing(false);
      // Refresh the page to show new activity
      setTimeout(() => {
        if (path === "/") window.location.reload();
        else router.push("/");
      }, 1500);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      setListening(false);
      const err = event?.error || "unknown";
      if (err === "no-speech") {
        showMessage("No speech detected. Tap and speak.", true);
      } else if (err === "not-allowed") {
        showMessage("Microphone access denied. Check your browser settings.", true);
      } else {
        showMessage(`Voice error: ${err}`, true);
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    try {
      recognition.start();
    } catch {
      setListening(false);
      showMessage("Could not start microphone. Try again.", true);
    }
  };

  const busy = listening || processing;

  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={handleRecord}
        disabled={processing}
        aria-label="Record activity"
        className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-lg transition-all active:scale-95 ${
          listening
            ? "animate-pulse bg-red-500 text-white ring-4 ring-red-200"
            : processing
            ? "bg-violet-300 text-white"
            : "bg-gradient-to-r from-violet-600 via-pink-500 to-amber-400 text-white"
        }`}
      >
        {listening ? "🎤" : processing ? "⏳" : "🎙"}
      </button>

      {message && (
        <div
          className={`absolute bottom-[4.5rem] w-64 rounded-xl px-3 py-2.5 text-center text-[11px] font-semibold shadow-lg ${
            isError
              ? "bg-red-50 text-red-600 border border-red-100"
              : "bg-violet-50 text-violet-700 border border-violet-100"
          }`}
        >
          {message}
          {isError && (
            <button
              onClick={() => { setMessage(""); setIsError(false); }}
              className="block mx-auto mt-1 text-[10px] opacity-60"
            >
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}
