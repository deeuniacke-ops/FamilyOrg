"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { GameEvent, Team } from "@/lib/types";
import {
  getTeams,
  getEvents,
  getAllResponses,
  getPlayersForTeam,
} from "@/lib/store";

const DEFAULT_MIN_SQUAD = 11;
const MIN_SQUAD_KEY = "cluichi_min_squad";

function getMinSquad(): number {
  try {
    const val = localStorage.getItem(MIN_SQUAD_KEY);
    if (val) return parseInt(val) || DEFAULT_MIN_SQUAD;
  } catch {}
  return DEFAULT_MIN_SQUAD;
}

function setMinSquadStorage(val: number): void {
  try {
    localStorage.setItem(MIN_SQUAD_KEY, String(val));
  } catch {}
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Group Sat/Sun into one "weekend" bucket; weekdays stay standalone
function getWeekendKey(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const day = date.getDay(); // 0=Sun, 6=Sat
  if (day === 0) {
    // Sunday → group with previous Saturday
    const sat = new Date(date);
    sat.setDate(sat.getDate() - 1);
    return (
      sat.getFullYear() +
      "-" +
      String(sat.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(sat.getDate()).padStart(2, "0")
    );
  }
  return dateStr;
}

function formatDateRange(dates: string[]): string {
  if (dates.length === 1) return formatDate(dates[0]);
  const first = new Date(dates[0] + "T00:00:00");
  const last = new Date(dates[dates.length - 1] + "T00:00:00");
  const firstStr = first.toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
  });
  const lastStr = last.toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${firstStr} – ${lastStr}`;
}

function formatShortDay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-IE", { weekday: "short" });
}

type TeamFixture = {
  team: Team;
  event: GameEvent;
  available: number;
  totalPlayers: number;
  surplus: number;
};

type DateRow = {
  date: string;      // grouping key (Saturday for weekends, date itself otherwise)
  dates: string[];   // all unique match dates in this group
  teamFixtures: TeamFixture[];
  totalAvailable: number;
  totalNeeded: number;
  totalSurplus: number;
  action: "good" | "shuffle" | "move";
};

type ViewMode = "weekends" | "day";

// ── Smart Hint Generator ─────────────────────────────────────

function getSmartHint(row: DateRow): string {
  if (row.action === "good") return "";
  const weekend = row.dates.length > 1 ? " this weekend" : "";

  if (row.action === "move") {
    const deficit = Math.abs(row.totalSurplus);
    if (row.teamFixtures.length === 1) {
      return `Short ${deficit} player${deficit !== 1 ? "s" : ""}`;
    }
    return `Short ${deficit} player${deficit !== 1 ? "s" : ""} across ${row.teamFixtures.length} teams${weekend}`;
  }

  // Shuffle — find who has surplus and who has deficit
  const surplus = row.teamFixtures.filter((tf) => tf.surplus > 0);
  const deficit = row.teamFixtures.filter((tf) => tf.surplus < 0);

  if (surplus.length === 1 && deficit.length === 1) {
    const from = surplus[0];
    const to = deficit[0];
    const shortDiv = (d: string) => d.replace("Women's ", "").replace("Division ", "Div ");
    return `${shortDiv(from.team.division)} can spare ${from.surplus} → ${shortDiv(to.team.division)} needs ${Math.abs(to.surplus)}`;
  }

  if (surplus.length > 0 && deficit.length > 0) {
    const totalSpare = surplus.reduce((s, tf) => s + tf.surplus, 0);
    return `${totalSpare} player${totalSpare !== 1 ? "s" : ""} can be shuffled between teams`;
  }

  return "Players can be redistributed";
}

// ── Bar Chart Component ──────────────────────────────────────

function AvailabilityBar({
  available,
  needed,
  label,
}: {
  available: number;
  needed: number;
  label: string;
}) {
  const max = Math.max(available, needed, 1);
  const filledPct = Math.min((available / max) * 100, 100);
  const neededPct = (needed / max) * 100;
  const isShort = available < needed;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-slate-600 w-12 shrink-0 truncate">
        {label}
      </span>
      <div className="flex-1 relative h-5">
        {/* Needed marker line */}
        <div
          className="absolute top-0 bottom-0 border-r-2 border-dashed border-slate-300 z-10"
          style={{ left: `${neededPct}%` }}
        />
        {/* Filled bar */}
        <div
          className={`absolute top-0.5 bottom-0.5 rounded-full transition-all duration-300 ${
            isShort ? "bg-red-400" : "bg-pitch-500"
          }`}
          style={{ width: `${filledPct}%`, minWidth: available > 0 ? "8px" : "0" }}
        />
        {/* Background track */}
        <div className="absolute top-0.5 bottom-0.5 left-0 right-0 bg-gray-100 rounded-full -z-10" />
      </div>
      <span
        className={`text-xs font-bold w-10 text-right shrink-0 tabular-nums ${
          isShort ? "text-red-500" : "text-slate-600"
        }`}
      >
        {available}/{needed}
      </span>
    </div>
  );
}


// ── Date Card ────────────────────────────────────────────────

function DateCard({
  row,
  minSquad,
  id,
  highlightClash = false,
}: {
  row: DateRow;
  minSquad: number;
  id: string;
  highlightClash?: boolean;
}) {
  const borderColor =
    row.action === "good"
      ? "border-l-pitch-400"
      : row.action === "shuffle"
      ? "border-l-amber-400"
      : "border-l-red-500";

  const clashLabel =
    row.teamFixtures.length === 1
      ? null
      : row.dates.length > 1
      ? `${row.teamFixtures.length} teams · weekend`
      : highlightClash
      ? `⚡ ${row.teamFixtures.length} teams · same day`
      : `${row.teamFixtures.length} teams clash`;

  const hint = getSmartHint(row);

  return (
    <div
      id={id}
      className={`bg-white rounded-2xl shadow-card border-l-[4px] ${borderColor} overflow-hidden`}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">
              {formatDateRange(row.dates)}
            </span>
            {clashLabel && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                highlightClash
                  ? "text-blue-600 bg-blue-50"
                  : "text-slate-400 bg-slate-50"
              }`}>
                {clashLabel}
              </span>
            )}
          </div>
          {row.action !== "good" && (
            <span
              className={`text-lg font-black tabular-nums ${
                row.totalSurplus >= 0 ? "text-amber-500" : "text-red-500"
              }`}
            >
              {row.totalSurplus > 0 ? "+" : ""}
              {row.totalSurplus}
            </span>
          )}
        </div>
      </div>

      {/* Team bars */}
      <div className="px-4 pb-3 space-y-2">
        {row.teamFixtures.map((tf) => {
          const shortDiv = tf.team.division
            .replace("Women's ", "")
            .replace("Division ", "Div ");

          return (
            <Link
              key={tf.event.id}
              href={`/event/${tf.event.id}`}
              className="block active:opacity-70 transition-opacity"
            >
              <AvailabilityBar
                available={tf.available}
                needed={minSquad}
                label={shortDiv}
              />
              <div className="flex items-center gap-2 ml-[60px] mt-0.5">
                <span className="text-[11px] text-slate-400">
                  vs {tf.event.opponentShort || tf.event.opponent}
                  {row.dates.length > 1 && (
                    <span className="ml-1 text-slate-300">
                      · {formatShortDay(tf.event.date)}
                    </span>
                  )}
                </span>
                {tf.event.homeAway && (
                  <span
                    className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                      tf.event.homeAway === "H"
                        ? "bg-pitch-50 text-pitch-700"
                        : "bg-gray-100 text-slate-400"
                    }`}
                  >
                    {tf.event.homeAway}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Smart hint */}
      {hint && (
        <div
          className={`px-4 py-2.5 text-xs font-medium flex items-center gap-2 ${
            row.action === "move"
              ? "bg-red-50 text-red-600"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          <span>{row.action === "move" ? "⚠️" : "💡"}</span>
          {hint}
        </div>
      )}
    </div>
  );
}

// ── Compact Good Row ─────────────────────────────────────────

function GoodDateRow({ row, minSquad }: { row: DateRow; minSquad: number }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-pitch-400 shrink-0" />
        <span className="text-xs font-semibold text-slate-600">
          {formatDateRange(row.dates)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {row.teamFixtures.map((tf) => {
          const shortDiv = tf.team.division
            .replace("Women's ", "")
            .replace("Division ", "Div ");
          return (
            <span key={tf.event.id} className="text-[11px] text-slate-400">
              {shortDiv}
              {row.dates.length > 1 && (
                <span className="text-slate-300"> {formatShortDay(tf.event.date)}</span>
              )}{" "}
              <span className="font-bold text-pitch-600">
                {tf.available}/{minSquad}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function FixturePlanner() {
  const [weekendRows, setWeekendRows] = useState<DateRow[]>([]);
  const [dayRows, setDayRows] = useState<DateRow[]>([]);
  const [minSquad, setMinSquad] = useState(DEFAULT_MIN_SQUAD);
  const [editingSquad, setEditingSquad] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("weekends");
  const [showGood, setShowGood] = useState(false);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => {
    const allTeams = getTeams();
    const today = new Date();
    const todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
    const allEvents = getEvents().filter((e) => e.type === "match" && e.date >= todayStr);
    const allResponses = getAllResponses();
    const squad = getMinSquad();

    setMinSquad(squad);

    // Build rows with a given grouping key function
    function buildRows(keyFn: (d: string) => string): DateRow[] {
      const dateMap = new Map<string, { team: Team; event: GameEvent }[]>();
      for (const event of allEvents) {
        const team = allTeams.find((t) => t.id === event.teamId);
        if (!team) continue;
        const key = keyFn(event.date);
        const existing = dateMap.get(key) || [];
        existing.push({ team, event });
        dateMap.set(key, existing);
      }

      const dateRows: DateRow[] = [];
      const sortedDates = Array.from(dateMap.keys()).sort();

      for (const date of sortedDates) {
        const fixtures = dateMap.get(date) || [];
        const teamFixtures = fixtures.map(({ team, event }) => {
          const teamPlayers = getPlayersForTeam(team.id);
          const eventResponses = allResponses.filter(
            (r) => r.eventId === event.id
          );
          const available = eventResponses.filter(
            (r) => r.status === "available"
          ).length;
          return {
            team,
            event,
            available,
            totalPlayers: teamPlayers.length,
            surplus: available - squad,
          };
        });

        const totalAvailable = teamFixtures.reduce(
          (sum, tf) => sum + tf.available,
          0
        );
        const totalNeeded = teamFixtures.length * squad;
        const totalSurplus = totalAvailable - totalNeeded;

        let action: "good" | "shuffle" | "move";
        if (totalSurplus >= 0 && teamFixtures.every((tf) => tf.surplus >= 0)) {
          action = "good";
        } else if (totalSurplus >= 0) {
          action = "shuffle";
        } else {
          action = "move";
        }

        const uniqueDates = [
          ...new Set(fixtures.map(({ event }) => event.date)),
        ].sort();

        dateRows.push({
          date,
          dates: uniqueDates,
          teamFixtures,
          totalAvailable,
          totalNeeded,
          totalSurplus,
          action,
        });
      }

      return dateRows;
    }

    setWeekendRows(buildRows(getWeekendKey));
    setDayRows(buildRows((d) => d));
  }, []);

  useEffect(() => {
    refresh();
    setMounted(true);
  }, [refresh]);

  const handleMinSquadChange = (val: number) => {
    const clamped = Math.max(1, Math.min(30, val));
    setMinSquad(clamped);
    setMinSquadStorage(clamped);
    refresh();
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const rows = viewMode === "weekends" ? weekendRows : dayRows;
  const problemRows = rows.filter((r) => r.action !== "good");
  const goodRows = rows.filter((r) => r.action === "good");
  const moveRows = rows.filter((r) => r.action === "move");
  const shuffleRows = rows.filter((r) => r.action === "shuffle");
  const sameDayClashes = viewMode === "day"
    ? rows.filter((r) => r.teamFixtures.length > 1).length
    : 0;

  return (
    <div className="animate-fade-in px-4">

      {/* View tabs + min squad */}
      <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setViewMode("weekends")}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              viewMode === "weekends"
                ? "bg-pitch-600 text-white shadow-md"
                : "bg-white text-slate-500 border border-gray-200 active:bg-gray-50"
            }`}
          >
            Weekends
          </button>
          <button
            onClick={() => setViewMode("day")}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              viewMode === "day"
                ? "bg-pitch-600 text-white shadow-md"
                : "bg-white text-slate-500 border border-gray-200 active:bg-gray-50"
            }`}
          >
            Day
            {sameDayClashes > 0 && (
              <span
                className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black ${
                  viewMode === "day"
                    ? "bg-white/30 text-white"
                    : "bg-blue-100 text-blue-500"
                }`}
              >
                {sameDayClashes}
              </span>
            )}
          </button>

          {/* Min squad — right-aligned */}
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
            <span>Min:</span>
            {editingSquad ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleMinSquadChange(minSquad - 1)}
                  className="w-7 h-7 rounded-lg bg-gray-100 text-slate-600 font-bold flex items-center justify-center active:bg-gray-200"
                >
                  −
                </button>
                <span className="w-8 text-center font-bold text-slate-700 text-sm">
                  {minSquad}
                </span>
                <button
                  onClick={() => handleMinSquadChange(minSquad + 1)}
                  className="w-7 h-7 rounded-lg bg-gray-100 text-slate-600 font-bold flex items-center justify-center active:bg-gray-200"
                >
                  +
                </button>
                <button
                  onClick={() => { setEditingSquad(false); refresh(); }}
                  className="ml-1 text-pitch-600 font-semibold"
                >
                  Done
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingSquad(true)}
                className="font-semibold text-slate-600 underline decoration-dotted active:opacity-60"
              >
                {minSquad}
              </button>
            )}
          </div>
      </div>

      {/* No fixtures */}
      {rows.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-slate-500 font-medium">No fixtures to plan</p>
          <p className="text-slate-400 text-sm mt-1">
            Add matches across your teams to see clash analysis
          </p>
        </div>
      )}

      {/* Date cards */}
      {rows.length > 0 && (
        <div className="space-y-3">
          {/* Problem dates as full cards, chronological (season runs Sep → Mar) */}
          {problemRows
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((row) => (
              <DateCard
                key={row.date}
                row={row}
                minSquad={minSquad}
                id={`date-${row.date}`}
                highlightClash={viewMode === "day" && row.teamFixtures.length > 1}
              />
            ))}

          {/* Good dates — compact or collapsed */}
          {goodRows.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowGood(!showGood)}
                className="w-full flex items-center justify-between py-3 text-xs font-bold text-slate-400 active:text-slate-600"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pitch-400" />
                  {goodRows.length} fixture{goodRows.length !== 1 ? "s" : ""} all good
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${showGood ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showGood && (
                <div className="bg-white rounded-2xl shadow-card px-4 divide-y divide-gray-50 animate-fade-in">
                  {goodRows.map((row) => (
                    <GoodDateRow
                      key={row.date}
                      row={row}
                      minSquad={minSquad}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
