"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Player, Team } from "@/lib/types";
import {
  getPlayersForTeam,
  addPlayer,
  updatePlayer,
  removePlayerFromTeam,
  getTeams,
  getActiveTeamId,
  setActiveTeamId,
  updateTeam,
  addTeam,
} from "@/lib/store";
import { CURRENT_USER_ID } from "@/lib/mock-data";

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function TeamPage() {
  const [players, setPlayerList] = useState<Player[]>([]);
  const [teams, setTeamsList] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamDiv, setNewTeamDiv] = useState("");
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(
    (tid?: string) => {
      const activeId = tid || teamId || getActiveTeamId();
      setPlayerList(
        getPlayersForTeam(activeId).sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setTeamsList(getTeams());
      setTeamId(activeId);
    },
    [teamId]
  );

  useEffect(() => {
    refresh();
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [editingPlayer, editingField]);

  const activeTeam = teams.find((t) => t.id === teamId);

  const handleTeamSwitch = (tid: string) => {
    setActiveTeamId(tid);
    setEditMode(false);
    setEditingPlayer(null);
    setEditingField(null);
    refresh(tid);
  };

  const handleEditTeamField = (field: keyof Team) => {
    if (!activeTeam) return;
    setEditingField(field);
    setTempValue(activeTeam[field]);
  };

  const saveTeamField = () => {
    if (editingField && activeTeam) {
      updateTeam(teamId, {
        [editingField]: tempValue.trim() || activeTeam[editingField as keyof Team],
      });
      refresh();
    }
    setEditingField(null);
    setTempValue("");
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player.id);
    setTempValue(player.name);
  };

  const savePlayerName = () => {
    if (editingPlayer && tempValue.trim()) {
      updatePlayer(editingPlayer, { name: tempValue.trim() });
      refresh();
    }
    setEditingPlayer(null);
    setTempValue("");
  };

  const handleRemovePlayer = (id: string) => {
    if (id === CURRENT_USER_ID) return;
    removePlayerFromTeam(id, teamId);
    refresh();
  };

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      addPlayer(newPlayerName.trim(), teamId);
      setNewPlayerName("");
      setShowAddPlayer(false);
      refresh();
    }
  };

  const handleAddTeam = () => {
    if (newTeamDiv.trim()) {
      const newTeam = addTeam({
        name: activeTeam?.name || "Cork Wanderers",
        shortName: activeTeam?.shortName || "CW",
        division: newTeamDiv.trim(),
        league: activeTeam?.league || "Munster Hockey",
        season: activeTeam?.season || "2026/27",
      });
      setNewTeamDiv("");
      setShowAddTeam(false);
      handleTeamSwitch(newTeam.id);
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const TeamField = ({
    field,
    label,
  }: {
    field: keyof Team;
    label: string;
  }) => {
    const value = activeTeam?.[field] || "";
    const isTitle = field === "name";

    if (editMode && editingField === field) {
      return (
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
            {label}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={saveTeamField}
            onKeyDown={(e) => e.key === "Enter" && saveTeamField()}
            className={`w-full border-b-2 border-pitch-500 outline-none bg-transparent py-0.5 ${
              isTitle
                ? "text-lg font-bold text-slate-900"
                : "text-sm text-slate-600"
            }`}
          />
        </div>
      );
    }
    return (
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
          {label}
        </label>
        <div
          className={`flex items-center gap-2 ${
            isTitle
              ? "text-lg font-bold text-slate-900"
              : "text-sm text-slate-600"
          } ${editMode ? "cursor-pointer active:opacity-60" : ""}`}
          onClick={() => editMode && handleEditTeamField(field)}
        >
          {value}
          {editMode && <EditIcon />}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">Team</h2>
        <button
          onClick={() => {
            setEditMode(!editMode);
            setEditingPlayer(null);
            setEditingField(null);
            setShowAddPlayer(false);
          }}
          className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            editMode
              ? "bg-pitch-600 text-white"
              : "bg-gray-100 text-slate-500 active:bg-gray-200"
          }`}
        >
          {editMode ? "Done" : "Edit"}
        </button>
      </div>

      {/* Team tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1 scrollbar-hide">
        {teams.map((team) => (
          <button
            key={team.id}
            onClick={() => handleTeamSwitch(team.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              team.id === teamId
                ? "bg-pitch-600 text-white shadow-sm"
                : "bg-white text-slate-500 border border-gray-200 active:bg-gray-50"
            }`}
          >
            {team.division}
          </button>
        ))}
        {editMode && (
          <button
            onClick={() => setShowAddTeam(true)}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 border-dashed border-gray-300 text-slate-400 active:bg-gray-50"
          >
            + Team
          </button>
        )}
      </div>

      {/* Add team modal */}
      {showAddTeam && (
        <div className="bg-white rounded-xl p-3 mb-4 flex gap-2 animate-fade-in shadow-card">
          <input
            autoFocus
            type="text"
            value={newTeamDiv}
            onChange={(e) => setNewTeamDiv(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTeam()}
            placeholder="Division name (e.g. Women's Division 3)"
            className="flex-1 text-sm px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-pitch-500 outline-none"
          />
          <button
            onClick={handleAddTeam}
            disabled={!newTeamDiv.trim()}
            className="px-4 py-2 rounded-lg bg-pitch-600 text-white text-sm font-semibold disabled:opacity-30"
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowAddTeam(false);
              setNewTeamDiv("");
            }}
            className="px-3 py-2 rounded-lg bg-gray-100 text-slate-500 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Team info card */}
      {activeTeam && (
        <div className="bg-white rounded-2xl shadow-card p-4 mb-5">
          <div className="space-y-3">
            <TeamField field="name" label="Club Name" />
            <TeamField field="division" label="Division" />
            <div className="flex gap-6">
              <div className="flex-1">
                <TeamField field="league" label="League" />
              </div>
              <div className="flex-1">
                <TeamField field="season" label="Season" />
              </div>
            </div>
            <TeamField field="shortName" label="Short Name" />
          </div>
        </div>
      )}

      {/* Player list */}
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Players ({players.length})
        </h3>
        {editMode && (
          <button
            onClick={() => setShowAddPlayer(true)}
            className="text-xs font-semibold text-pitch-600 active:opacity-60"
          >
            + Add Player
          </button>
        )}
      </div>

      {showAddPlayer && (
        <div className="bg-white rounded-xl p-3 mb-2 flex gap-2 animate-fade-in">
          <input
            autoFocus
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
            placeholder="Player name"
            className="flex-1 text-sm px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-pitch-500 outline-none"
          />
          <button
            onClick={handleAddPlayer}
            disabled={!newPlayerName.trim()}
            className="px-4 py-2 rounded-lg bg-pitch-600 text-white text-sm font-semibold disabled:opacity-30"
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowAddPlayer(false);
              setNewPlayerName("");
            }}
            className="px-3 py-2 rounded-lg bg-gray-100 text-slate-500 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl overflow-hidden divide-y divide-gray-50">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pitch-100 to-pitch-200 flex items-center justify-center text-sm font-bold text-pitch-700 shrink-0">
                {player.name.charAt(0)}
              </div>

              {editMode && editingPlayer === player.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={savePlayerName}
                  onKeyDown={(e) => e.key === "Enter" && savePlayerName()}
                  className="flex-1 text-sm font-medium text-slate-800 border-b-2 border-pitch-500 outline-none bg-transparent py-0.5"
                />
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {player.name}
                    {player.id === CURRENT_USER_ID && (
                      <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-pitch-600 bg-pitch-50 px-1.5 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                    {player.isAdmin && (
                      <span className="ml-1 text-[10px] text-amber-500 font-semibold">
                        ★ Admin
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {editMode && editingPlayer !== player.id && (
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button
                  onClick={() => handleEditPlayer(player)}
                  className="p-2 rounded-lg active:bg-gray-100"
                >
                  <EditIcon />
                </button>
                {player.id !== CURRENT_USER_ID && (
                  <button
                    onClick={() => handleRemovePlayer(player.id)}
                    className="p-2 rounded-lg active:bg-red-50"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
