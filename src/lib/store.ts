"use client";

import { GameEvent, EventResponse, AvailabilityStatus, Player, Team } from "./types";
import {
  events as mockEvents,
  players as mockPlayers,
  initialResponses,
  teams as mockTeams,
  DEFAULT_TEAM_ID,
  CURRENT_USER_ID,
} from "./mock-data";
import { db } from "./firebase";

const EVENTS_KEY = "cluichi_events";
const RESPONSES_KEY = "cluichi_responses";
const PLAYERS_KEY = "cluichi_players";
const TEAMS_KEY = "cluichi_teams";
const ACTIVE_TEAM_KEY = "cluichi_active_team";
const CLUB_NAME_KEY = "cluichi_club_name";
const CLUB_INSTAGRAM_KEY = "cluichi_club_instagram";
const THEME_KEY = "cluichi_theme";

function safeGetItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // localStorage unavailable or corrupted
  }
  return fallback;
}

function safeSetItem(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or unavailable
  }
}

// ── Firestore helpers ─────────────────────────────────────────

/** Notify the UI about sync issues */
function notifyError(message: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("cluichi-toast", {
        detail: { id: Date.now(), text: message, type: "error" },
      })
    );
  }
}

/** Fire-and-forget Firestore write — shows toast on failure */
function fsWrite(fn: () => Promise<void>): void {
  fn().catch((e) => {
    console.error("Firestore write error:", e);
    const msg =
      e?.code === "permission-denied"
        ? "Sync blocked — your change is saved locally only"
        : "Couldn't sync — your change is saved locally only";
    notifyError(msg);
  });
}

/** Strip undefined values — Firestore rejects them */
function clean(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) result[k] = v;
  }
  return result;
}

// ── Teams ──────────────────────────────────────────────────────

export function getTeams(): Team[] {
  return safeGetItem<Team[]>(TEAMS_KEY, mockTeams).sort((a, b) => {
    const numA = parseInt(a.division.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.division.replace(/\D/g, "")) || 0;
    return numA - numB || a.division.localeCompare(b.division);
  });
}

export function getTeam(id: string): Team | undefined {
  return getTeams().find((t) => t.id === id);
}

export function addTeam(team: Omit<Team, "id">): Team {
  const teams = getTeams();
  const newTeam: Team = { ...team, id: `t${Date.now()}` };
  teams.push(newTeam);
  safeSetItem(TEAMS_KEY, teams);
  fsWrite(() => db.collection("teams").doc(newTeam.id).set(clean({ ...newTeam })));
  return newTeam;
}

export function updateTeam(id: string, updates: Partial<Team>): void {
  const teams = getTeams();
  const index = teams.findIndex((t) => t.id === id);
  if (index >= 0) {
    teams[index] = { ...teams[index], ...updates };
    safeSetItem(TEAMS_KEY, teams);
    fsWrite(() => db.collection("teams").doc(id).set(clean({ ...teams[index] })));
  }
}

export async function removeTeam(id: string): Promise<void> {
  // Capture data for Firestore cascade before modifying localStorage
  const eventsToDelete = getEvents().filter((e) => e.teamId === id);
  const eventIds = new Set(eventsToDelete.map((e) => e.id));
  const responsesToDelete = getAllResponses().filter((r) => eventIds.has(r.eventId));
  const playersToUpdate = getPlayers().filter((p) => (p.teamIds || []).includes(id));

  // localStorage cleanup
  const responses = getAllResponses().filter((r) => !eventIds.has(r.eventId));
  safeSetItem(RESPONSES_KEY, responses);
  const events = getEvents().filter((e) => e.teamId !== id);
  safeSetItem(EVENTS_KEY, events);
  const players = getPlayers().map((p) => ({
    ...p,
    teamIds: (p.teamIds || []).filter((tid) => tid !== id),
    nominatedTeamIds: (p.nominatedTeamIds || []).filter((tid) => tid !== id),
  }));
  safeSetItem(PLAYERS_KEY, players);
  const teams = getTeams().filter((t) => t.id !== id);
  safeSetItem(TEAMS_KEY, teams);

  // Firestore cascade — await so UI doesn't refresh before delete completes
  try {
    const batch = db.batch();
    for (const r of responsesToDelete) {
      batch.delete(db.collection("responses").doc(`${r.eventId}_${r.playerId}`));
    }
    for (const e of eventsToDelete) {
      batch.delete(db.collection("events").doc(e.id));
    }
    for (const p of playersToUpdate) {
      batch.set(db.collection("players").doc(p.id), clean({
        ...p,
        teamIds: (p.teamIds || []).filter((tid) => tid !== id),
        nominatedTeamIds: (p.nominatedTeamIds || []).filter((tid) => tid !== id),
      }));
    }
    batch.delete(db.collection("teams").doc(id));
    await batch.commit();
  } catch (e) {
    console.error("Firestore removeTeam error:", e);
    notifyError("Couldn't sync deletion — removed locally only");
  }
}

export function getActiveTeamId(): string {
  return safeGetItem<string>(ACTIVE_TEAM_KEY, DEFAULT_TEAM_ID);
}

export function setActiveTeamId(id: string): void {
  safeSetItem(ACTIVE_TEAM_KEY, id); // per-device preference only
}

export function getActiveTeam(): Team {
  const id = getActiveTeamId();
  return getTeam(id) || getTeams()[0] || mockTeams[0];
}

// ── Players ────────────────────────────────────────────────────

export function getPlayers(): Player[] {
  return safeGetItem<Player[]>(PLAYERS_KEY, mockPlayers);
}

export function getPlayersForTeam(teamId: string): Player[] {
  return getPlayers().filter(
    (p) => !p.teamIds || p.teamIds.length === 0 || p.teamIds.includes(teamId)
  );
}

export function addPlayer(name: string, teamId?: string): Player {
  const players = getPlayers();
  const newPlayer: Player = {
    id: `p${Date.now()}`,
    name: name.trim(),
    isAdmin: false,
    teamIds: teamId ? [teamId] : [getActiveTeamId()],
  };
  players.push(newPlayer);
  safeSetItem(PLAYERS_KEY, players);
  fsWrite(() => db.collection("players").doc(newPlayer.id).set(clean({ ...newPlayer })));
  return newPlayer;
}

export function updatePlayer(id: string, updates: Partial<Player>): void {
  const players = getPlayers();
  const index = players.findIndex((p) => p.id === id);
  if (index >= 0) {
    players[index] = { ...players[index], ...updates };
    safeSetItem(PLAYERS_KEY, players);
    fsWrite(() => db.collection("players").doc(id).set(clean({ ...players[index] })));
  }
}

export function addPlayerToTeam(playerId: string, teamId: string): void {
  const players = getPlayers();
  const index = players.findIndex((p) => p.id === playerId);
  if (index >= 0) {
    const teamIds = new Set(players[index].teamIds || []);
    teamIds.add(teamId);
    players[index].teamIds = Array.from(teamIds);
    safeSetItem(PLAYERS_KEY, players);
    fsWrite(() => db.collection("players").doc(playerId).set(clean({ ...players[index] })));
  }
}

export async function removePlayerFromTeam(playerId: string, teamId: string): Promise<void> {
  const players = getPlayers();
  const index = players.findIndex((p) => p.id === playerId);
  const toRemove = getAllResponses().filter(
    (r) => r.playerId === playerId && getEventsForTeam(teamId).some((e) => e.id === r.eventId)
  );

  // Check if this is the player's last team — if so, delete them entirely
  const remainingTeams = index >= 0
    ? (players[index].teamIds || []).filter((id) => id !== teamId)
    : [];
  const shouldDelete = index >= 0 && remainingTeams.length === 0;

  if (shouldDelete) {
    // Remove player entirely — no teams left
    const updated = players.filter((p) => p.id !== playerId);
    safeSetItem(PLAYERS_KEY, updated);
  } else if (index >= 0) {
    players[index].teamIds = remainingTeams;
    safeSetItem(PLAYERS_KEY, players);
  }

  const teamEventIds = new Set(getEventsForTeam(teamId).map((e) => e.id));
  const responses = getAllResponses().filter(
    (r) => !(r.playerId === playerId && teamEventIds.has(r.eventId))
  );
  safeSetItem(RESPONSES_KEY, responses);

  // Await Firestore so onSnapshot doesn't restore deleted data
  try {
    const batch = db.batch();
    if (shouldDelete) {
      batch.delete(db.collection("players").doc(playerId));
    } else if (index >= 0) {
      batch.set(db.collection("players").doc(playerId), clean({ ...players[index] }));
    }
    for (const r of toRemove) {
      batch.delete(db.collection("responses").doc(`${r.eventId}_${r.playerId}`));
    }
    await batch.commit();
  } catch (e) {
    console.error("Firestore removePlayerFromTeam error:", e);
    notifyError("Couldn't sync deletion — removed locally only");
  }
}

export async function removePlayer(id: string): Promise<void> {
  const responsesToDelete = getAllResponses().filter((r) => r.playerId === id);

  const players = getPlayers().filter((p) => p.id !== id);
  safeSetItem(PLAYERS_KEY, players);
  const responses = getAllResponses().filter((r) => r.playerId !== id);
  safeSetItem(RESPONSES_KEY, responses);

  try {
    const batch = db.batch();
    batch.delete(db.collection("players").doc(id));
    for (const r of responsesToDelete) {
      batch.delete(db.collection("responses").doc(`${r.eventId}_${r.playerId}`));
    }
    await batch.commit();
  } catch (e) {
    console.error("Firestore removePlayer error:", e);
    notifyError("Couldn't sync deletion — removed locally only");
  }
}

// ── Events ─────────────────────────────────────────────────────

export function getEvents(): GameEvent[] {
  return safeGetItem<GameEvent[]>(EVENTS_KEY, mockEvents);
}

export function getEventsForTeam(teamId: string): GameEvent[] {
  return getEvents()
    .filter((e) => e.teamId === teamId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getEvent(id: string): GameEvent | undefined {
  return getEvents().find((e) => e.id === id);
}

export function addEvent(
  event: Omit<GameEvent, "id" | "createdBy"> & { teamId?: string }
): GameEvent {
  const events = getEvents();
  const newEvent: GameEvent = {
    ...event,
    id: `e${Date.now()}`,
    createdBy: CURRENT_USER_ID,
    teamId: event.teamId || getActiveTeamId(),
  };
  events.push(newEvent);
  events.sort((a, b) => a.date.localeCompare(b.date));
  safeSetItem(EVENTS_KEY, events);
  fsWrite(() => db.collection("events").doc(newEvent.id).set(clean({ ...newEvent })));
  return newEvent;
}

export function updateEvent(id: string, updates: Partial<GameEvent>): void {
  const events = getEvents();
  const index = events.findIndex((e) => e.id === id);
  if (index >= 0) {
    events[index] = { ...events[index], ...updates };
    events.sort((a, b) => a.date.localeCompare(b.date));
    safeSetItem(EVENTS_KEY, events);
    fsWrite(() => db.collection("events").doc(id).set(clean({ ...events[index] })));
  }
}

export async function removeEvent(id: string): Promise<void> {
  const responsesToDelete = getAllResponses().filter((r) => r.eventId === id);

  const events = getEvents().filter((e) => e.id !== id);
  safeSetItem(EVENTS_KEY, events);
  const responses = getAllResponses().filter((r) => r.eventId !== id);
  safeSetItem(RESPONSES_KEY, responses);

  try {
    const batch = db.batch();
    batch.delete(db.collection("events").doc(id));
    for (const r of responsesToDelete) {
      batch.delete(db.collection("responses").doc(`${r.eventId}_${r.playerId}`));
    }
    await batch.commit();
  } catch (e) {
    console.error("Firestore removeEvent error:", e);
    notifyError("Couldn't sync deletion — removed locally only");
  }
}

// ── Responses ──────────────────────────────────────────────────

export function getResponses(eventId: string): EventResponse[] {
  return getAllResponses().filter((r) => r.eventId === eventId);
}

export function getAllResponses(): EventResponse[] {
  return safeGetItem<EventResponse[]>(RESPONSES_KEY, initialResponses);
}

export function setAvailability(
  eventId: string,
  status: AvailabilityStatus
): void {
  const all = safeGetItem<EventResponse[]>(RESPONSES_KEY, initialResponses);
  const existingIndex = all.findIndex(
    (r) => r.eventId === eventId && r.playerId === CURRENT_USER_ID
  );
  const docId = `${eventId}_${CURRENT_USER_ID}`;

  if (status === null) {
    if (existingIndex >= 0) all.splice(existingIndex, 1);
    fsWrite(() => db.collection("responses").doc(docId).delete());
  } else {
    const response: EventResponse = {
      eventId,
      playerId: CURRENT_USER_ID,
      status,
      respondedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      all[existingIndex] = response;
    } else {
      all.push(response);
    }
    fsWrite(() => db.collection("responses").doc(docId).set(response));
  }
  safeSetItem(RESPONSES_KEY, all);
}

export function getMyResponse(eventId: string): AvailabilityStatus {
  const mine = getAllResponses().find(
    (r) => r.eventId === eventId && r.playerId === CURRENT_USER_ID
  );
  return mine?.status ?? null;
}

/** Set any player's availability — used by the grid tap interaction */
export function setPlayerAvailability(
  eventId: string,
  playerId: string,
  status: AvailabilityStatus
): void {
  const all = safeGetItem<EventResponse[]>(RESPONSES_KEY, initialResponses);
  const existingIndex = all.findIndex(
    (r) => r.eventId === eventId && r.playerId === playerId
  );
  const docId = `${eventId}_${playerId}`;

  if (status === null) {
    if (existingIndex >= 0) all.splice(existingIndex, 1);
    fsWrite(() => db.collection("responses").doc(docId).delete());
  } else {
    const response: EventResponse = {
      eventId,
      playerId,
      status,
      respondedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      all[existingIndex] = response;
    } else {
      all.push(response);
    }
    fsWrite(() => db.collection("responses").doc(docId).set(response));
  }
  safeSetItem(RESPONSES_KEY, all);
}

/** Cycle: null → available → unavailable → null */
export function cycleAvailability(
  eventId: string,
  playerId: string
): AvailabilityStatus {
  const all = safeGetItem<EventResponse[]>(RESPONSES_KEY, initialResponses);
  const existing = all.find(
    (r) => r.eventId === eventId && r.playerId === playerId
  );
  const current = existing?.status ?? null;

  let next: AvailabilityStatus;
  if (current === null) next = "available";
  else if (current === "available") next = "unavailable";
  else next = null;

  setPlayerAvailability(eventId, playerId, next);
  return next;
}

// ── Theme ─────────────────────────────────────────────────────

export function getTheme(): string {
  return safeGetItem<string>(THEME_KEY, "forest");
}

export function setTheme(theme: string): void {
  safeSetItem(THEME_KEY, theme); // per-device only
}

// ── Club Name ─────────────────────────────────────────────────

export function getClubName(): string {
  const stored = safeGetItem<string>(CLUB_NAME_KEY, "");
  if (stored) return stored;
  const teams = getTeams();
  return teams.length > 0 ? teams[0].name : "My Club";
}

export function setClubName(name: string): void {
  safeSetItem(CLUB_NAME_KEY, name);
  fsWrite(() => db.collection("settings").doc("club").set({ name }, { merge: true }));
}

// ── Club Instagram ──────────────────────────────────────────────

export function getClubInstagram(): string {
  return safeGetItem<string>(CLUB_INSTAGRAM_KEY, "");
}

export function setClubInstagram(url: string): void {
  safeSetItem(CLUB_INSTAGRAM_KEY, url);
  fsWrite(() => db.collection("settings").doc("club").set({ instagram: url }, { merge: true }));
}

// ── Reset ──────────────────────────────────────────────────────

/** Clears local cache AND all availability responses from Firestore.
 *  Returns a promise — await it before reloading the page. */
export async function resetData(): Promise<void> {
  try {
    localStorage.removeItem(EVENTS_KEY);
    localStorage.removeItem(RESPONSES_KEY);
    localStorage.removeItem(PLAYERS_KEY);
    localStorage.removeItem(TEAMS_KEY);
    localStorage.removeItem(ACTIVE_TEAM_KEY);
    localStorage.removeItem(CLUB_NAME_KEY);
    localStorage.removeItem(CLUB_INSTAGRAM_KEY);
  } catch {
    // ignore
  }

  // Clear all responses from Firestore so availability resets for everyone
  try {
    const snapshot = await db.collection("responses").get();
    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log(`✓ Cleared ${snapshot.size} responses from Firestore`);
    }
  } catch (e) {
    console.error("Failed to clear Firestore responses:", e);
  }
}

// ── Firestore Real-Time Sync ──────────────────────────────────

/** Set up real-time listeners. Call once on app mount. Returns cleanup. */
export function setupFirestoreSync(): () => void {
  const unsubs: (() => void)[] = [];

  // Seed Firestore if empty (first-ever load)
  db.collection("teams")
    .get()
    .then((snapshot) => {
      if (snapshot.empty) seedFirestore();
    })
    .catch((e) => console.error("Firestore seed check failed:", e));

  const onError = (e: Error) => {
    console.error("Firestore listener error:", e);
    notifyError("Lost connection to server — using local data");
  };

  // Teams — d.id (Firestore doc ID) is authoritative, placed AFTER spread
  unsubs.push(
    db.collection("teams").onSnapshot((snapshot) => {
      const teams = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as Team);
      safeSetItem(TEAMS_KEY, teams);
      window.dispatchEvent(new Event("firestore-sync"));
    }, onError)
  );

  // Players
  unsubs.push(
    db.collection("players").onSnapshot((snapshot) => {
      const players = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as Player);
      safeSetItem(PLAYERS_KEY, players);
      window.dispatchEvent(new Event("firestore-sync"));
    }, onError)
  );

  // Events
  unsubs.push(
    db.collection("events").onSnapshot((snapshot) => {
      const events = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as GameEvent);
      safeSetItem(EVENTS_KEY, events);
      window.dispatchEvent(new Event("firestore-sync"));
    }, onError)
  );

  // Responses
  unsubs.push(
    db.collection("responses").onSnapshot((snapshot) => {
      const responses = snapshot.docs.map((d) => d.data() as EventResponse);
      safeSetItem(RESPONSES_KEY, responses);
      window.dispatchEvent(new Event("firestore-sync"));
    }, onError)
  );

  // Club settings (name, instagram, etc.)
  unsubs.push(
    db.collection("settings").doc("club").onSnapshot((snapshot) => {
      if (snapshot.exists) {
        const data = snapshot.data();
        if (data?.name) {
          safeSetItem(CLUB_NAME_KEY, data.name);
          window.dispatchEvent(new Event("club-name-changed"));
        }
        if (data?.instagram !== undefined) {
          safeSetItem(CLUB_INSTAGRAM_KEY, data.instagram);
          window.dispatchEvent(new Event("club-settings-changed"));
        }
      }
    }, onError)
  );

  return () => unsubs.forEach((fn) => fn());
}

/** Seed Firestore with initial mock data (runs once on first-ever load) */
async function seedFirestore(): Promise<void> {
  try {
    const batch = db.batch();
    for (const team of mockTeams) {
      batch.set(db.collection("teams").doc(team.id), clean({ ...team }));
    }
    for (const player of mockPlayers) {
      batch.set(db.collection("players").doc(player.id), clean({ ...player }));
    }
    for (const event of mockEvents) {
      batch.set(db.collection("events").doc(event.id), clean({ ...event }));
    }
    batch.set(db.collection("settings").doc("club"), { name: mockTeams[0]?.name || "My Club" });
    await batch.commit();
    console.log("✓ Firestore seeded with initial data");
  } catch (e) {
    console.error("Firestore seed failed:", e);
  }
}
