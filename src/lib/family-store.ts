import { db } from "./firebase";
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from "firebase/firestore";

export type Child = {
  id: string;
  name: string;
  age: number;
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
  owner?: string;
};

const FAMILY_NAME_KEY = "familyorg_family_name";
const CHILDREN_KEY = "familyorg_children";
const ACTIVITIES_KEY = "familyorg_activities";

const colours = ["#d9468b", "#42b883", "#7554c7", "#e68a35", "#2f80c0", "#db4f4f"];

function dateForNextSaturday(): string {
  const d = new Date();
  const days = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addDays(date: string, amount: number): string {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + amount);
  return d.toISOString().slice(0, 10);
}

export const demoChildren: Child[] = [
  { id: "child-emma", name: "Emma-Louise", age: 12, initials: "EL", color: colours[0] },
  { id: "child-aedy", name: "Aedy", age: 10, initials: "AD", color: colours[1] },
  { id: "child-jane", name: "Jane", age: 8, initials: "JA", color: colours[2] },
];

const saturday = dateForNextSaturday();
export const demoActivities: FamilyActivity[] = [
  { id: "activity-1", childId: "child-emma", title: "Hockey Training", date: saturday, time: "10:00", durationMinutes: 120 },
  { id: "activity-2", childId: "child-aedy", title: "Football Training", date: saturday, time: "10:00", durationMinutes: 90 },
  { id: "activity-3", childId: "child-jane", title: "Horse Riding", date: saturday, time: "10:00", durationMinutes: 60 },
  { id: "activity-4", childId: "child-emma", title: "Hockey Match", date: addDays(saturday, 1), time: "10:00", durationMinutes: 120 },
  { id: "activity-5", childId: "child-aedy", title: "Football Match", date: addDays(saturday, 1), time: "14:00", durationMinutes: 90 },
  { id: "activity-6", childId: "child-jane", title: "Horse Riding", date: addDays(saturday, 1), time: "11:30", durationMinutes: 60 },
];

function get<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch { return fallback; }
}
function set(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/** Strip undefined values — Firestore rejects them */
function clean<T extends object>(obj: T): T {
  const copy = { ...obj } as Record<string, unknown>;
  Object.keys(copy).forEach((k) => { if (copy[k] === undefined) delete copy[k]; });
  return copy as T;
}

function fsWrite(run: () => Promise<unknown>) { run().catch(() => { /* offline: local cache still updated */ }); }

// In-memory cache, seeded from localStorage for an instant first paint,
// then kept live by Firestore so every device sees the same data.
let familyNameCache: string = get(FAMILY_NAME_KEY, "Uniacke");
let childrenCache: Child[] = get(CHILDREN_KEY, demoChildren);
let activitiesCache: FamilyActivity[] = get(ACTIVITIES_KEY, demoActivities);

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("family-sync"));
}

let seededDemoData = false;

if (typeof window !== "undefined") {
  onSnapshot(collection(db, "children"), (snapshot) => {
    if (snapshot.empty && !seededDemoData) {
      seededDemoData = true;
      fsWrite(async () => {
        const batch = writeBatch(db);
        demoChildren.forEach((child) => batch.set(doc(db, "children", child.id), clean(child)));
        demoActivities.forEach((activity) => batch.set(doc(db, "activities", activity.id), clean(activity)));
        await batch.commit();
      });
      return; // keep showing the local demo fallback until the seed write echoes back
    }
    childrenCache = snapshot.docs.map((d) => d.data() as Child);
    set(CHILDREN_KEY, childrenCache);
    notify();
  });
  onSnapshot(collection(db, "activities"), (snapshot) => {
    activitiesCache = snapshot.docs.map((d) => d.data() as FamilyActivity);
    set(ACTIVITIES_KEY, activitiesCache);
    notify();
  });
  onSnapshot(doc(db, "settings", "family"), (snapshot) => {
    const name = snapshot.data()?.name;
    if (typeof name === "string") {
      familyNameCache = name;
      set(FAMILY_NAME_KEY, name);
      notify();
    }
  });
}

export function getFamilyName(): string { return familyNameCache; }
export function setFamilyName(name: string) {
  familyNameCache = name;
  set(FAMILY_NAME_KEY, name);
  fsWrite(() => setDoc(doc(db, "settings", "family"), { name }, { merge: true }));
}

export function getChildren(): Child[] { return childrenCache; }
export function addChild(input: Omit<Child, "id">): Child {
  const child = { ...input, id: `child-${Date.now()}` };
  childrenCache = [...childrenCache, child];
  set(CHILDREN_KEY, childrenCache);
  fsWrite(() => setDoc(doc(db, "children", child.id), clean(child)));
  return child;
}
export function updateChild(id: string, updates: Partial<Omit<Child, "id">>) {
  childrenCache = childrenCache.map((child) => child.id === id ? { ...child, ...updates } : child);
  set(CHILDREN_KEY, childrenCache);
  fsWrite(() => setDoc(doc(db, "children", id), clean(updates), { merge: true }));
}
export function removeChild(id: string) {
  const orphanedActivityIds = activitiesCache.filter((activity) => activity.childId === id).map((a) => a.id);
  childrenCache = childrenCache.filter((child) => child.id !== id);
  activitiesCache = activitiesCache.filter((activity) => activity.childId !== id);
  set(CHILDREN_KEY, childrenCache);
  set(ACTIVITIES_KEY, activitiesCache);
  fsWrite(async () => {
    const batch = writeBatch(db);
    batch.delete(doc(db, "children", id));
    orphanedActivityIds.forEach((activityId) => batch.delete(doc(db, "activities", activityId)));
    await batch.commit();
  });
}

export function getActivities(): FamilyActivity[] { return activitiesCache; }
export function addActivity(input: Omit<FamilyActivity, "id">): FamilyActivity {
  const activity = { ...input, id: `activity-${Date.now()}`, durationMinutes: input.durationMinutes || 60 };
  activitiesCache = [...activitiesCache, activity];
  set(ACTIVITIES_KEY, activitiesCache);
  fsWrite(() => setDoc(doc(db, "activities", activity.id), clean(activity)));
  return activity;
}
export function updateActivity(id: string, updates: Partial<Omit<FamilyActivity, "id">>) {
  activitiesCache = activitiesCache.map((activity) => activity.id === id ? { ...activity, ...updates } : activity);
  set(ACTIVITIES_KEY, activitiesCache);
  fsWrite(() => setDoc(doc(db, "activities", id), clean(updates), { merge: true }));
}
export function removeActivity(id: string) {
  activitiesCache = activitiesCache.filter((activity) => activity.id !== id);
  set(ACTIVITIES_KEY, activitiesCache);
  fsWrite(() => deleteDoc(doc(db, "activities", id)));
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
