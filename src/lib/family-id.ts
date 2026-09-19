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
