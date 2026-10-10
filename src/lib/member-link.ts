"use client";

/** Which helper name this device belongs to - a lightweight, local,
 *  no-sign-in-required "who am I" pick, available to every family member
 *  (unlike the family owner, who signs in with Google for billing/
 *  accountability purposes). Mirrors family-id.ts's plain-localStorage
 *  pattern - not synced to Firestore, purely per-device. */
const MY_HELPER_KEY = "familyorg_my_helper_name";

export function getMyHelperName(): string | null {
  try {
    return localStorage.getItem(MY_HELPER_KEY);
  } catch {
    return null;
  }
}

export function setMyHelperName(name: string) {
  try {
    localStorage.setItem(MY_HELPER_KEY, name);
    window.dispatchEvent(new Event("my-identity-sync"));
  } catch {
    /* ignore */
  }
}

export function clearMyHelperName() {
  try {
    localStorage.removeItem(MY_HELPER_KEY);
    window.dispatchEvent(new Event("my-identity-sync"));
  } catch {
    /* ignore */
  }
}
