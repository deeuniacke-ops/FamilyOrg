"use client";

import { GoogleAuthProvider, getRedirectResult, onAuthStateChanged, signInWithRedirect, signOut, User } from "firebase/auth";
import { auth } from "./firebase";

let currentUser: User | null = null;
let initialized = false;

/** Call once (from FamilyGate) - resolves any pending redirect sign-in and
 *  keeps currentUser in sync thereafter, mirroring family-store.ts's
 *  module-cache + window-event pattern ("member-sync" instead of "family-sync").
 *  Redirect (not popup) because the app mainly runs as an installed standalone
 *  PWA, where popup-based OAuth is unreliable. */
export function initAuthListener() {
  if (initialized) return;
  initialized = true;
  getRedirectResult(auth).catch((err) => console.error("getRedirectResult failed:", err));
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (typeof window !== "undefined") window.dispatchEvent(new Event("member-sync"));
  });
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export function signInWithGoogle() {
  return signInWithRedirect(auth, new GoogleAuthProvider());
}

export function signOutUser() {
  return signOut(auth);
}
