import { db } from "./firebase";
import { collection, doc, onSnapshot, setDoc, deleteDoc, deleteField, writeBatch } from "firebase/firestore";

export type Child = {
  id: string;
  name: string;
  age?: number;
  initials: string;
  color: string;
};

export type FamilyActivity = {
  id: string;
  childId: string;
  title: string;
  date: string;
  time: string;
  durationMinutes: number;
  location?: string;
  notes?: string;
  recurring?: "weekly";
  owner?: string[];
  collector?: string[];
};

/** Older activities stored owner as a single string - normalize on read */
function normalizeOwner(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string" && raw) return [raw];
  return undefined;
}

const FAMILY_NAME_KEY = "familyorg_family_name";
const CHILDREN_KEY = "familyorg_children";
const ACTIVITIES_KEY = "familyorg_activities";
const HELPERS_KEY = "familyorg_helpers";
const CACHE_OWNER_KEY = "familyorg_cache_owner"; // which familyId the cached keys above belong to

/** Default drop-off/collection helpers, seeded once for a brand-new family so existing behaviour doesn't change */
const DEFAULT_HELPERS = ["Mum", "Dad", "Nana", "Grandad", "Carpool"];

const colours = ["#d9468b", "#42b883", "#7554c7", "#e68a35", "#2f80c0", "#db4f4f"];

function get<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch { return fallback; }
}
function set(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/** For full-document creation — Firestore rejects undefined values outright */
function clean<T extends object>(obj: T): T {
  const copy = { ...obj } as Record<string, unknown>;
  Object.keys(copy).forEach((k) => { if (copy[k] === undefined) delete copy[k]; });
  return copy as T;
}

/** For merge updates — undefined means "clear this field", which Firestore
 *  only does via an explicit deleteField() sentinel, not by omitting the key */
function cleanForUpdate<T extends object>(obj: T): Record<string, unknown> {
  const copy = { ...obj } as Record<string, unknown>;
  Object.keys(copy).forEach((k) => { if (copy[k] === undefined) copy[k] = deleteField(); });
  return copy;
}

function fsWrite(run: () => Promise<unknown>) { run().catch(() => { /* offline: local cache still updated */ }); }

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("family-sync"));
}

// In-memory cache, mirrored to localStorage for an instant repaint on
// reload, and kept live by Firestore so every device in the family sees
// the same data. Scoped under families/{activeFamilyId} — see initFamilySync.
let activeFamilyId: string | null = null;
let unsubscribers: Array<() => void> = [];
let familyNameCache = "";
let childrenCache: Child[] = [];
let activitiesCache: FamilyActivity[] = [];
let helpersCache: string[] = [];

function requireFamilyId(): string {
  if (!activeFamilyId) throw new Error("family-store used before initFamilySync() completed");
  return activeFamilyId;
}
function childrenCol() { return collection(db, "families", requireFamilyId(), "children"); }
function activitiesCol() { return collection(db, "families", requireFamilyId(), "activities"); }
function childDoc(id: string) { return doc(db, "families", requireFamilyId(), "children", id); }
function activityDoc(id: string) { return doc(db, "families", requireFamilyId(), "activities", id); }
function familySettingsDoc() { return doc(db, "families", requireFamilyId(), "settings", "family"); }
function helpersDoc() { return doc(db, "families", requireFamilyId(), "settings", "helpers"); }

/**
 * Starts (or switches) live sync for a family's namespace. `seedDisplayName`
 * is only used the first time a brand-new family space is created, to give
 * it an initial header name instead of a blank one.
 */
export function initFamilySync(familyId: string, seedDisplayName?: string) {
  if (activeFamilyId === familyId) return;
  unsubscribers.forEach((unsubscribe) => unsubscribe());
  unsubscribers = [];
  activeFamilyId = familyId;

  if (get(CACHE_OWNER_KEY, "") === familyId) {
    childrenCache = get(CHILDREN_KEY, []);
    activitiesCache = get<FamilyActivity[]>(ACTIVITIES_KEY, []).map((a) => ({ ...a, owner: normalizeOwner(a.owner) }));
    familyNameCache = get(FAMILY_NAME_KEY, "");
    helpersCache = get(HELPERS_KEY, DEFAULT_HELPERS);
  } else {
    childrenCache = [];
    activitiesCache = [];
    familyNameCache = "";
    helpersCache = DEFAULT_HELPERS;
    set(CACHE_OWNER_KEY, familyId);
    set(CHILDREN_KEY, []);
    set(ACTIVITIES_KEY, []);
    set(FAMILY_NAME_KEY, "");
    set(HELPERS_KEY, DEFAULT_HELPERS);
  }
  notify();

  unsubscribers.push(onSnapshot(childrenCol(), (snapshot) => {
    childrenCache = snapshot.docs.map((d) => d.data() as Child);
    set(CHILDREN_KEY, childrenCache);
    notify();
  }));
  unsubscribers.push(onSnapshot(activitiesCol(), (snapshot) => {
    activitiesCache = snapshot.docs.map((d) => {
      const data = d.data() as FamilyActivity;
      return { ...data, owner: normalizeOwner(data.owner) };
    });
    set(ACTIVITIES_KEY, activitiesCache);
    notify();
  }));
  unsubscribers.push(onSnapshot(familySettingsDoc(), (snapshot) => {
    const name = snapshot.data()?.name;
    if (typeof name === "string") {
      familyNameCache = name;
      set(FAMILY_NAME_KEY, name);
      notify();
    } else if (seedDisplayName && !snapshot.exists()) {
      fsWrite(() => setDoc(familySettingsDoc(), { name: seedDisplayName }, { merge: true }));
    }
  }));
  unsubscribers.push(onSnapshot(helpersDoc(), (snapshot) => {
    const names = snapshot.data()?.names;
    if (Array.isArray(names)) {
      helpersCache = names;
      set(HELPERS_KEY, helpersCache);
      notify();
    } else if (!snapshot.exists()) {
      fsWrite(() => setDoc(helpersDoc(), { names: DEFAULT_HELPERS }, { merge: true }));
    }
  }));
}

export function getFamilyName(): string { return familyNameCache; }
export function setFamilyName(name: string) {
  familyNameCache = name;
  set(FAMILY_NAME_KEY, name);
  fsWrite(() => setDoc(familySettingsDoc(), { name }, { merge: true }));
}

export function getHelpers(): string[] { return helpersCache; }
export function addHelper(name: string) {
  const trimmed = name.trim();
  if (!trimmed || helpersCache.includes(trimmed)) return;
  helpersCache = [...helpersCache, trimmed];
  set(HELPERS_KEY, helpersCache);
  fsWrite(() => setDoc(helpersDoc(), { names: helpersCache }, { merge: true }));
}
export function removeHelper(name: string) {
  helpersCache = helpersCache.filter((h) => h !== name);
  set(HELPERS_KEY, helpersCache);
  fsWrite(() => setDoc(helpersDoc(), { names: helpersCache }, { merge: true }));
}

export function getChildren(): Child[] { return childrenCache; }
export function addChild(input: Omit<Child, "id">): Child {
  const child = { ...input, id: `child-${Date.now()}` };
  childrenCache = [...childrenCache, child];
  set(CHILDREN_KEY, childrenCache);
  fsWrite(() => setDoc(childDoc(child.id), clean(child)));
  return child;
}
export function updateChild(id: string, updates: Partial<Omit<Child, "id">>) {
  childrenCache = childrenCache.map((child) => child.id === id ? { ...child, ...updates } : child);
  set(CHILDREN_KEY, childrenCache);
  fsWrite(() => setDoc(childDoc(id), cleanForUpdate(updates), { merge: true }));
}
export function removeChild(id: string) {
  const orphanedActivityIds = activitiesCache.filter((activity) => activity.childId === id).map((a) => a.id);
  childrenCache = childrenCache.filter((child) => child.id !== id);
  activitiesCache = activitiesCache.filter((activity) => activity.childId !== id);
  set(CHILDREN_KEY, childrenCache);
  set(ACTIVITIES_KEY, activitiesCache);
  fsWrite(async () => {
    const batch = writeBatch(db);
    batch.delete(childDoc(id));
    orphanedActivityIds.forEach((activityId) => batch.delete(activityDoc(activityId)));
    await batch.commit();
  });
}

export function getActivities(): FamilyActivity[] { return activitiesCache; }
export function addActivity(input: Omit<FamilyActivity, "id">): FamilyActivity {
  const activity = { ...input, id: `activity-${Date.now()}`, durationMinutes: input.durationMinutes || 60 };
  activitiesCache = [...activitiesCache, activity];
  set(ACTIVITIES_KEY, activitiesCache);
  fsWrite(() => setDoc(activityDoc(activity.id), clean(activity)));
  return activity;
}
export function updateActivity(id: string, updates: Partial<Omit<FamilyActivity, "id">>) {
  activitiesCache = activitiesCache.map((activity) => activity.id === id ? { ...activity, ...updates } : activity);
  set(ACTIVITIES_KEY, activitiesCache);
  fsWrite(() => setDoc(activityDoc(id), cleanForUpdate(updates), { merge: true }));
}
export function removeActivity(id: string) {
  activitiesCache = activitiesCache.filter((activity) => activity.id !== id);
  set(ACTIVITIES_KEY, activitiesCache);
  fsWrite(() => deleteDoc(activityDoc(id)));
}

/** Return activities for a set of dates, expanding weekly recurring ones */
export function getActivitiesForDates(dates: string[]): FamilyActivity[] {
  const all = getActivities();
  const result: FamilyActivity[] = [];
  for (const date of dates) {
    const dayOfWeek = new Date(date + "T12:00:00").getDay();
    for (const a of all) {
      if (a.date === date) {
        result.push(a);
      } else if (a.recurring === "weekly") {
        const activityDay = new Date(a.date + "T12:00:00").getDay();
        if (activityDay === dayOfWeek && a.date <= date) {
          result.push({ ...a, id: `${a.id}_${date}`, date });
        }
      }
    }
  }
  return result;
}
export { colours };
