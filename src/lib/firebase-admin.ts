import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/** Server-only — never import this from a "use client" file.
 *  Bypasses Firestore security rules entirely, so it's the only thing
 *  allowed to read pushSubscriptions (which the client can't read back). */
export function getAdminDb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
    const serviceAccount = JSON.parse(raw);
    // Pasting the key JSON through a web UI can turn the private key's real
    // newlines into literal "\n" text — normalize back before use.
    if (typeof serviceAccount.private_key === "string") {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}
