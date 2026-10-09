"use client";

import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getStoredFamilyId } from "./family-id";
import { getCurrentUser } from "./auth";

export type MemberLink = { helperName: string; displayName?: string; photoURL?: string };

let linkCache: MemberLink | null = null;
let unsubscribe: (() => void) | null = null;
let trackedKey = ""; // `${familyId}::${uid}` the current listener is bound to

function syncListener() {
  const familyId = getStoredFamilyId();
  const uid = getCurrentUser()?.uid;
  const key = familyId && uid ? `${familyId}::${uid}` : "";
  if (key === trackedKey) return;
  unsubscribe?.();
  unsubscribe = null;
  linkCache = null;
  trackedKey = key;
  if (!familyId || !uid) {
    window.dispatchEvent(new Event("member-sync"));
    return;
  }
  unsubscribe = onSnapshot(doc(db, "families", familyId, "members", uid), (snap) => {
    const data = snap.data();
    linkCache = data?.helperName ? { helperName: data.helperName, displayName: data.displayName, photoURL: data.photoURL } : null;
    window.dispatchEvent(new Event("member-sync"));
  });
}

/** Call once (from FamilyGate) - cheap no-op re-check on every
 *  "member-sync"/"family-sync" event when familyId/uid haven't changed. */
export function initMemberLinkSync() {
  syncListener();
  window.addEventListener("member-sync", syncListener);
  window.addEventListener("family-sync", syncListener);
}

export function getLinkedMember(): MemberLink | null {
  return linkCache;
}

export function linkMemberToHelper(helperName: string): Promise<void> {
  const familyId = getStoredFamilyId();
  const user = getCurrentUser();
  if (!familyId || !user) return Promise.reject(new Error("Not signed in"));
  const payload: Record<string, unknown> = { helperName, linkedAt: new Date().toISOString() };
  if (user.displayName) payload.displayName = user.displayName;
  if (user.photoURL) payload.photoURL = user.photoURL;
  return setDoc(doc(db, "families", familyId, "members", user.uid), payload);
}
