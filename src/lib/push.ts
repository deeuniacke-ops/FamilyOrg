"use client";

import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getStoredFamilyId } from "./family-id";

export type PushStatus = "unsupported" | "denied" | "subscribed" | "unsubscribed";

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** VAPID public keys are base64url — the Push API needs a raw Uint8Array */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function isSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!isSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? "subscribed" : "unsubscribed";
}

export async function subscribeToPush(): Promise<{ ok: boolean; message?: string }> {
  if (!isSupported()) return { ok: false, message: "Push notifications aren't supported in this browser." };

  const familyId = getStoredFamilyId();
  if (!familyId) return { ok: false, message: "Join a family first." };

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return { ok: false, message: "Notifications aren't configured yet." };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, message: "Notification permission was not granted." };

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });

    const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, message: "Couldn't read the push subscription." };
    }

    const subId = await sha256Hex(json.endpoint);
    await setDoc(doc(db, "families", familyId, "pushSubscriptions", subId), {
      endpoint: json.endpoint,
      keys: json.keys,
      createdAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
    return { ok: true };
  } catch (err) {
    console.error("subscribeToPush failed:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Couldn't enable notifications: ${detail}` };
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  const familyId = getStoredFamilyId();
  if (familyId) {
    const subId = await sha256Hex(subscription.endpoint);
    await deleteDoc(doc(db, "families", familyId, "pushSubscriptions", subId)).catch(() => {});
  }
  await subscription.unsubscribe();
}
