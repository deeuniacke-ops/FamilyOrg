"use client";

import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { auth } from "./firebase";

let currentUser: User | null = null;
let initialized = false;

/** Call once (from FamilyGate) - keeps currentUser in sync, mirroring
 *  family-store.ts's module-cache + window-event pattern ("member-sync"
 *  instead of "family-sync").
 *
 *  Uses signInWithPopup, not signInWithRedirect. Redirect depends on
 *  browser storage surviving a full-page navigation away and back to
 *  resolve via getRedirectResult() - iOS standalone PWAs handle that
 *  storage inconsistently, so the round trip completes visually but the
 *  app never sees the result (confirmed happening in testing). Popup never
 *  unloads the app's page, so there's no round trip to lose. */
export function initAuthListener() {
  if (initialized) return;
  initialized = true;
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (typeof window !== "undefined") window.dispatchEvent(new Event("member-sync"));
  });
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function signOutUser() {
  return signOut(auth);
}
