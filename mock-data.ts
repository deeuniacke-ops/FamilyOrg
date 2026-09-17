import { Player, GameEvent, EventResponse, Team } from "./types";

export const CURRENT_USER_ID = "p4"; // Dee

export const teams: Team[] = [
  { id: "t1", name: "Cork Wanderers", shortName: "CW", division: "Women's Division 4", league: "Munster Hockey", season: "2026/27" },
  { id: "t2", name: "Cork Wanderers", shortName: "CW", division: "Women's Division 2", league: "Munster Hockey", season: "2026/27" },
  { id: "t3", name: "Cork Wanderers", shortName: "CW", division: "Women's Division 6", league: "Munster Hockey", season: "2026/27" },
];

export const DEFAULT_TEAM_ID = "t1";

// ═══════════════════════════════════════════════════════
// ROSTERS — names only, Player objects built below
// ═══════════════════════════════════════════════════════

const div4Roster = [
  "Ceara", "Ciara", "Dearbhaile", "Dee", "Dymphna", "Fiona",
  "Jill", "Katie", "Leah", "Lorna", "Louise", "Mairead",
  "Michelle", "Niamh", "Rhea", "Yvonne",
];

const div2Roster = [
  "Angie", "Blaithin", "Brid", "Eimear", "Elaine", "Grainne",
  "Helen", "Jean", "Jessie", "Julie", "Kealan", "Marissa",
  "Orla", "Pamela", "Stephanie", "Vivienne",
];

const div6Roster = [
  "Aoife", "Annie", "Emer", "Emma", "Enya", "Erin",
  "Hannah", "Heather", "Jamie", "Jean", "Laura", "Lauren",
  "Liz", "Maeve", "Meg", "Michelle", "Nancy", "Roisin",
  "Sinead", "Tricia", "Una",
];

// ── ID ranges: Div 4 → p1+, Div 2 → p20+, Div 6 → p40+ ──

const D4_BASE = 1;
const D2_BASE = 20;
const D6_BASE = 40;

function buildRoster(
  names: string[],
  idBase: number,
  teamId: string,
  opts?: { admin?: number[]; nominated?: number[]; extraTeams?: Record<number, string[]> },
): Player[] {
  return names.map((name, i) => ({
    id: `p${idBase + i}`,
    name,
    isAdmin: opts?.admin?.includes(i) ?? false,
    teamIds: [teamId, ...(opts?.extraTeams?.[i] ?? [])],
    ...(opts?.nominated?.includes(i) ? { nominatedTeamIds: [teamId] } : {}),
  }));
}

// ═══════════════════════════════════════════════════════
// BUILD PLAYERS
// ═══════════════════════════════════════════════════════

const div4Players = buildRoster(div4Roster, D4_BASE, "t1", {
  admin: [3], // Dee
  extraTeams: { 3: ["t2"] }, // Dee on Div 4 + Div 2
});

const div2Players = buildRoster(div2Roster, D2_BASE, "t2");

const div6Players = buildRoster(div6Roster, D6_BASE, "t3");

export const players: Player[] = [
  ...div4Players,
  ...div2Players,
  ...div6Players,
];

// ═══════════════════════════════════════════════════════
// FIXTURES — data arrays, GameEvent objects built below
// [opponent, short, date, time, H/A, location?]
// ═══════════════════════════════════════════════════════
type FixtureRow = [string, string, string, string, "H" | "A", string?];

const div4Fixtures: FixtureRow[] = [
  ["Harlequins",  "HAR", "2026-09-27", "TBD", "H"],
  ["Tipperary",   "TIP", "2026-10-03", "TBD", "A"],
  ["Cashel",      "CAS", "2026-10-11", "TBD", "A"],
  ["Belvedere",   "BEL", "2026-10-17", "TBD", "H"],
  ["UCC",         "UCC", "2026-11-08", "TBD", "A"],
  ["Midleton",    "MID", "2026-11-15", "TBD", "A"],
  ["Corinthian",  "COI", "2026-11-29", "TBD", "A"],
  ["Harlequins",  "HAR", "2026-12-06", "TBD", "A"],
  ["Tipperary",   "TIP", "2026-12-12", "TBD", "A"],
  ["Cashel",      "CAS", "2027-01-16", "TBD", "H"],
  ["Belvedere",   "BEL", "2027-01-24", "TBD", "A"],
  ["UCC",         "UCC", "2027-02-13", "TBD", "H"],
  ["Midleton",    "MID", "2027-02-27", "TBD", "H"],
  ["Corinthian",  "COI", "2027-03-13", "TBD", "H"],
];

// ── Real fixtures from Munster Hockey GameDay (2026/27) ──
const div2Fixtures: FixtureRow[] = [
  ["UCC III",      "UC3", "2026-09-26", "TBD", "H", "Cork Wanderers"],
  ["UCC II",       "UC2", "2026-10-04", "TBD", "A", "UCC Mardyke"],
  ["Blackrock",    "BLK", "2026-10-17", "TBD", "A", "Blackrock HC"],
  ["Clonmel",      "CLO", "2026-10-31", "TBD", "H", "Cork Wanderers"],
  ["UCC III",      "UC3", "2026-11-14", "TBD", "A", "UCC Mardyke"],
  ["Harlequins",   "HAR", "2026-11-22", "TBD", "A", "Cork Harlequins"],
  ["Ashton",       "ASH", "2026-11-28", "TBD", "H", "Cork Wanderers"],
  ["Cath Inst",    "CI",  "2026-12-05", "TBD", "H", "Cork Wanderers"],
  ["UCC II",       "UC2", "2027-01-16", "TBD", "H", "Cork Wanderers"],
  ["Blackrock",    "BLK", "2027-01-30", "TBD", "H", "Cork Wanderers"],
  ["Clonmel",      "CLO", "2027-02-06", "TBD", "A", "Clonmel HC"],
  ["Harlequins",   "HAR", "2027-02-20", "TBD", "H", "Cork Wanderers"],
  ["Ashton",       "ASH", "2027-03-07", "TBD", "A", "Ashton HC"],
  ["Cath Inst",    "CI",  "2027-03-14", "TBD", "A", "Catholic Institute"],
];

// ── Real fixtures from Munster Hockey GameDay (2026/27) ──
const div6Fixtures: FixtureRow[] = [
  ["Ashton",    "ASH", "2026-09-27", "TBD", "A", "Ashton HC"],
  ["Nenagh",    "NEN", "2026-10-10", "TBD", "A", "Nenagh HC"],
  ["Crescent",  "CRE", "2026-10-17", "TBD", "A", "Crescent HC"],
  ["Blackrock", "BLK", "2026-11-01", "TBD", "H", "Cork Wanderers"],
  ["Waterford", "WAT", "2026-11-08", "TBD", "H", "Cork Wanderers"],
  ["UCC",       "UCC", "2026-11-14", "TBD", "A", "Cork Wanderers"],
  ["Limerick",  "LIM", "2026-11-22", "TBD", "A", "Villiers School"],
  ["C of I",    "COI", "2026-11-29", "TBD", "H", "Cork Wanderers"],
  ["Ashton",    "ASH", "2026-12-06", "TBD", "H", "Cork Wanderers"],
  ["Nenagh",    "NEN", "2027-01-10", "TBD", "H", "Cork Wanderers"],
  ["Crescent",  "CRE", "2027-01-17", "TBD", "H", "Cork Wanderers"],
  ["Blackrock", "BLK", "2027-01-23", "TBD", "A", "Blackrock HC"],
  ["Waterford", "WAT", "2027-01-30", "TBD", "A", "Waterford"],
  ["UCC",       "UCC", "2027-02-14", "TBD", "H", "UCC Mardyke"],
  ["Limerick",  "LIM", "2027-02-28", "TBD", "H", "Cork Wanderers"],
  ["C of I",    "COI", "2027-03-14", "TBD", "A", "Garryduff"],
];

// ── ID ranges: Div 4 → e1+, Div 2 → e20+, Div 6 → e40+ ──

function buildFixtures(rows: FixtureRow[], idBase: number, teamId: string): GameEvent[] {
  return rows.map(([opponent, short, date, time, ha, location], i) => ({
    id: `e${idBase + i}`,
    title: `vs ${opponent}`,
    type: "match" as const,
    date,
    time,
    location: location || "TBD",
    opponent,
    opponentShort: short,
    homeAway: ha,
    createdBy: CURRENT_USER_ID,
    teamId,
  }));
}

export const events: GameEvent[] = [
  ...buildFixtures(div4Fixtures, 1, "t1"),
  ...buildFixtures(div2Fixtures, 20, "t2"),
  ...buildFixtures(div6Fixtures, 40, "t3"),
];

// No pre-filled responses — availability starts clean
export const initialResponses: EventResponse[] = [];
