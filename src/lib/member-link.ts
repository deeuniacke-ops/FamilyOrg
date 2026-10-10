"use client";

/** Who this device belongs to - a lightweight, local, no-sign-in-required
 *  "who am I" pick, available to every family member (unlike the family
 *  owner, who signs in with Google for billing/accountability purposes).
 *  Mirrors family-id.ts's plain-localStorage pattern - not synced to
 *  Firestore, purely per-device.
 *
 *  One person can plausibly be both a driver/collector for the kids AND
 *  have their own activities (e.g. Mum drives Aedy to football, but also
 *  has her own Personal Training session) - so this isn't split into
 *  separate "helper" vs "child" identities. `name` matches against an
 *  activity's owner/collector string arrays (driving/collecting); `childId`
 *  (when this person is also a Child record) matches against childIds
 *  (whose activity it actually is). Both checks always run together. */
export type MyIdentity = { name: string; childId?: string };

const MY_IDENTITY_KEY = "familyorg_my_identity";

export function getMyIdentity(): MyIdentity | null {
  try {
    const raw = localStorage.getItem(MY_IDENTITY_KEY);
    return raw ? (JSON.parse(raw) as MyIdentity) : null;
  } catch {
    return null;
  }
}

export function setMyIdentity(identity: MyIdentity) {
  try {
    localStorage.setItem(MY_IDENTITY_KEY, JSON.stringify(identity));
    window.dispatchEvent(new Event("my-identity-sync"));
  } catch {
    /* ignore */
  }
}

export function clearMyIdentity() {
  try {
    localStorage.removeItem(MY_IDENTITY_KEY);
    window.dispatchEvent(new Event("my-identity-sync"));
  } catch {
    /* ignore */
  }
}
