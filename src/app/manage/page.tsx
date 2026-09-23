"use client";
import { useEffect, useState } from "react";
import {
  addChild, addHelper, colours, getChildren, getFamilyName, getHelpers,
  setFamilyName as saveFamilyName, removeChild, removeHelper, updateChild, Child,
} from "@/lib/family-store";
import { leaveFamily, getStoredFamilyId } from "@/lib/family-id";
import { getPushStatus, subscribeToPush, unsubscribeFromPush, PushStatus } from "@/lib/push";

export default function ManagePage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [helpers, setHelpers] = useState<string[]>([]);
  const [helperName, setHelperName] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [pushStatus, setPushStatus] = useState<PushStatus | "loading">("loading");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState("");

  const refresh = () => { setChildren(getChildren()); setHelpers(getHelpers()); setFamilyName(getFamilyName()); };
  useEffect(() => {
    refresh();
    getPushStatus().then(setPushStatus);
    window.addEventListener("family-sync", refresh);
    return () => window.removeEventListener("family-sync", refresh);
  }, []);

  const handleEnableNotifications = async () => {
    setPushBusy(true);
    setPushMessage("");
    try {
      const result = await subscribeToPush();
      if (!result.ok) setPushMessage(result.message || "Couldn't enable notifications.");
    } catch (err) {
      console.error("Enable notifications failed:", err);
      setPushMessage("Something went wrong enabling notifications.");
    } finally {
      setPushStatus(await getPushStatus().catch(() => "unsupported" as const));
      setPushBusy(false);
    }
  };

  const handleDisableNotifications = async () => {
    setPushBusy(true);
    try {
      await unsubscribeFromPush();
    } catch (err) {
      console.error("Disable notifications failed:", err);
    } finally {
      setPushStatus(await getPushStatus().catch(() => "unsupported" as const));
      setPushBusy(false);
    }
  };

  const handleSendTest = async () => {
    const familyId = getStoredFamilyId();
    if (!familyId) return;
    setTestSending(true);
    setTestResult("");
    try {
      const res = await fetch("/api/push/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId }),
      });
      const data = await res.json();
      if (!res.ok) setTestResult(data.error || "Couldn't send test notification.");
      else if (data.sent > 0) setTestResult(`Sent to ${data.sent} device${data.sent !== 1 ? "s" : ""}.`);
      else setTestResult(data.message || "Nothing sent.");
    } catch (err) {
      console.error("Send test notification failed:", err);
      setTestResult("Couldn't send test notification.");
    } finally {
      setTestSending(false);
    }
  };

  const initials = (n: string) => n.split(/\s+/).map((x) => x[0]).join("").slice(0, 2).toUpperCase();

  const add = () => {
    if (!name.trim()) return;
    addChild({ name: name.trim(), age: age ? Number(age) : undefined, initials: initials(name), color: colours[children.length % colours.length] });
    setName("");
    setAge("");
    refresh();
  };

  const handleShare = async () => {
    const fid = getStoredFamilyId();
    if (!fid) return;
    const url = `${window.location.origin}/?fid=${fid}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Join our family calendar", url }); } catch { /* user cancelled */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Link copied!");
    } catch {
      setShareStatus(url);
    }
    setTimeout(() => setShareStatus(""), 3000);
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-2xl shadow-card p-4 mb-6">
        <h3 className="font-bold text-slate-800 mb-2">Family Name</h3>
        <div className="flex gap-2">
          <input value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="Your family name" className="min-w-0 flex-1 p-3 rounded-xl border-2 border-gray-200 text-sm" />
          <button onClick={() => { saveFamilyName(familyName.trim() || "Family"); refresh(); }} className="px-4 rounded-xl bg-violet-600 text-white text-sm font-bold">Save</button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5">Shown in the header banner</p>
        <button onClick={handleShare} className="mt-3 w-full py-2.5 rounded-xl border-2 border-violet-200 bg-violet-50 text-sm font-bold text-violet-700">
          🔗 Share family link
        </button>
        {shareStatus && <p className="mt-2 break-all text-[10px] text-slate-400">{shareStatus}</p>}
        <p className="text-[10px] text-slate-400 mt-1.5">Anyone who opens this link joins this exact family &mdash; no need to type the name or passphrase</p>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-4 mb-6">
        <h3 className="font-bold text-slate-800 mb-1">Notifications</h3>
        <p className="text-[10px] text-slate-400 mb-3">Get a reminder on this device shortly before an activity starts</p>
        {pushStatus === "loading" && <p className="text-xs text-slate-400">Checking&hellip;</p>}
        {pushStatus === "unsupported" && <p className="text-xs text-slate-400">Not supported in this browser.</p>}
        {pushStatus === "denied" && <p className="text-xs text-slate-400">Notifications are blocked for this site in your browser settings.</p>}
        {(pushStatus === "unsubscribed") && (
          <button onClick={handleEnableNotifications} disabled={pushBusy} className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-40">
            {pushBusy ? "Enabling…" : "Enable on this device"}
          </button>
        )}
        {pushStatus === "subscribed" && (
          <button onClick={handleDisableNotifications} disabled={pushBusy} className="w-full py-2.5 rounded-xl border-2 border-gray-200 text-slate-500 text-sm font-bold disabled:opacity-40">
            {pushBusy ? "Disabling…" : "✓ Enabled on this device — tap to turn off"}
          </button>
        )}
        {pushMessage && <p className="mt-2 text-[11px] text-red-500">{pushMessage}</p>}
        {pushStatus === "subscribed" && (
          <>
            <button onClick={handleSendTest} disabled={testSending} className="w-full mt-2 py-2 rounded-xl border-2 border-violet-200 bg-violet-50 text-xs font-bold text-violet-700 disabled:opacity-40">
              {testSending ? "Sending…" : "Send a test notification"}
            </button>
            {testResult && <p className="mt-2 text-[11px] text-slate-500">{testResult}</p>}
          </>
        )}
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-1">Manage family</h2>
      <p className="text-sm text-slate-500 mb-5">Kids or parents &mdash; anyone whose activities you want on the planner.</p>

      <div className="bg-white rounded-2xl shadow-card p-4 mb-6">
        <h3 className="font-bold text-slate-800 mb-3">Add family member</h3>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="min-w-0 flex-1 p-3 rounded-xl border-2 border-gray-200 text-sm" />
          <input value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age (optional)" type="number" min="0" className="w-28 p-3 rounded-xl border-2 border-gray-200 text-sm" />
          <button onClick={add} className="px-4 rounded-xl bg-pitch-600 text-white font-bold">Add</button>
        </div>
      </div>

      <div className="space-y-3 mb-7">
        {children.map((child) => (
          <div key={child.id} className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-slate-700 font-bold shrink-0" style={{ backgroundColor: child.color }}>{child.initials}</div>
              <div className="flex-1 min-w-0">
                <input defaultValue={child.name} onBlur={(e) => { updateChild(child.id, { name: e.target.value, initials: initials(e.target.value) }); refresh(); }} className="font-bold text-slate-800 w-full outline-none" />
                <p className="text-xs text-slate-400">Age <input defaultValue={child.age ?? ""} placeholder="—" type="number" onBlur={(e) => { updateChild(child.id, { age: e.target.value ? Number(e.target.value) : undefined }); refresh(); }} className="w-10 outline-none" /></p>
              </div>
              <button onClick={() => { removeChild(child.id); refresh(); }} className="text-xs text-red-400 font-bold shrink-0">Remove</button>
            </div>
            <div className="flex gap-1.5 mt-3 pl-[60px]">
              {colours.map((c) => (
                <button
                  key={c}
                  aria-label={`Set color ${c}`}
                  onClick={() => { updateChild(child.id, { color: c }); refresh(); }}
                  className={`w-6 h-6 rounded-full transition-all ${child.color === c ? "ring-2 ring-offset-1 ring-violet-400" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-card p-4 mb-6">
        <h3 className="font-bold text-slate-800 mb-1">Who can drop off &amp; collect?</h3>
        <p className="text-[10px] text-slate-400 mb-3">Shown as options when adding or editing an activity</p>
        <div className="flex gap-2 mb-3">
          <input value={helperName} onChange={(e) => setHelperName(e.target.value)} placeholder="Name" onKeyDown={(e) => { if (e.key === "Enter") { addHelper(helperName); setHelperName(""); refresh(); } }} className="min-w-0 flex-1 p-3 rounded-xl border-2 border-gray-200 text-sm" />
          <button onClick={() => { addHelper(helperName); setHelperName(""); refresh(); }} className="px-4 rounded-xl bg-violet-600 text-white text-sm font-bold">Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {helpers.map((h) => (
            <span key={h} className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-lg bg-gray-100 text-xs font-bold text-slate-600">
              {h}
              <button onClick={() => { removeHelper(h); refresh(); }} className="text-slate-400 font-bold px-1">×</button>
            </span>
          ))}
        </div>
      </div>

      <button onClick={() => { if (confirm("Leave this family? You'll need the family name and passphrase again to come back.")) leaveFamily(); }} className="mt-8 mb-20 w-full py-2.5 rounded-xl border-2 border-gray-200 text-xs font-bold text-slate-400">
        Leave family / switch account
      </button>
    </div>
  );
}
