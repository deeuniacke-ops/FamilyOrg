"use client";

import { useEffect } from "react";
import { setupFirestoreSync } from "@/lib/store";

/** Invisible component that sets up real-time Firestore listeners on mount */
export default function FirestoreSync() {
  useEffect(() => {
    const cleanup = setupFirestoreSync();
    return cleanup;
  }, []);
  return null;
}
