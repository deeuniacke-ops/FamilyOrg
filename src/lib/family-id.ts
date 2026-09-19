const FAMILY_ID_KEY = "familyorg_family_id";

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A family's Firestore namespace is a hash of name+passphrase — nobody can
 *  read/write your family's data without knowing both, but there's no
 *  server-side account, password reset, or real authentication. */
export function deriveFamilyId(name: string, passphrase: string): Promise<string> {
  return sha256Hex(`${name.trim().toLowerCase()}::${passphrase}`);
}

export function getStoredFamilyId(): string | null {
  try { return localStorage.getItem(FAMILY_ID_KEY); } catch { return null; }
}
export function storeFamilyId(id: string) {
  try { localStorage.setItem(FAMILY_ID_KEY, id); } catch { /* ignore */ }
}
export function clearFamilyId() {
  try { localStorage.removeItem(FAMILY_ID_KEY); } catch { /* ignore */ }
}

export function leaveFamily() {
  clearFamilyId();
  if (typeof window !== "undefined") window.location.reload();
}

/**
 * Mirrors the family's initial into a cookie so the server can render the
 * correct per-family manifest/apple-touch-icon <link> tags in the very
 * first HTML response - a client-side-only DOM update isn't reliable for
 * iOS "Add to Home Screen", which appears to use the icon link present at
 * initial load rather than one mutated by JS afterward.
 */
export function setFamilyLetterCookie(name: string) {
  const match = name.trim().match(/[a-zA-Z]/);
  const letter = match ? match[0].toUpperCase() : "C";
  document.cookie = `family_letter=${letter}; path=/; max-age=31536000; SameSite=Lax`;
}
