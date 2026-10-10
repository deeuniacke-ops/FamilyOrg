"use client";

/** Who this device belongs to - a lightweight, local, no-sign-in-required
 *  "who am I" pick, available to every family member (unlike the family
 *  owner, who signs in with Google for billing/accountability purposes).
 *  Mirrors family-id.ts's plain-localStorage pattern - not synced to
 *  Firestore, purely per-device.
 *
 *  Two kinds, since they're matched against activities differently:
 *  - "helper": matched by name against an activity's owner/collector
 *    string arrays (who's driving/collecting).
 *  - "child": matched by id against an activity's childIds (whose
 *    activity it actually is - e.g. Emma-Lou has hockey, so Emma-Lou is
 *    the "owner" of that activity, distinct from who's driving her there). */
export type MyIdentity =
  | { type: "helper"; name: string }
  | { type: "child"; id: string; name: string };

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
