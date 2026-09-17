"use client";

import { Player, EventResponse, AvailabilityStatus } from "@/lib/types";
import { getPlayersForTeam, getActiveTeamId } from "@/lib/store";
import { CURRENT_USER_ID } from "@/lib/mock-data";

type Props = {
  responses: EventResponse[];
  teamId?: string;
};

type Section = {
  label: string;
  status: AvailabilityStatus | "noReply";
  color: string;
  dotColor: string;
  items: Player[];
};

function PlayerRow({ player, isYou }: { player: Player; isYou: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-1">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-500">
          {player.name.charAt(0)}
        </div>
        <div>
          <span className="text-sm font-medium text-slate-800">
            {player.name}
            {isYou && (
              <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-pitch-600 bg-pitch-50 px-1.5 py-0.5 rounded-full">
                You
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function RosterList({ responses, teamId }: Props) {
  const players = getPlayersForTeam(teamId || getActiveTeamId());
  const responseMap = new Map(responses.map((r) => [r.playerId, r.status]));

  const sections: Section[] = [
    {
      label: "Available",
      status: "available",
      color: "text-green-600",
      dotColor: "bg-green-500",
      items: players.filter((p) => responseMap.get(p.id) === "available"),
    },
    {
      label: "Maybe",
      status: "maybe",
      color: "text-amber-600",
      dotColor: "bg-amber-500",
      items: players.filter((p) => responseMap.get(p.id) === "maybe"),
    },
    {
      label: "Unavailable",
      status: "unavailable",
      color: "text-red-500",
      dotColor: "bg-red-500",
      items: players.filter((p) => responseMap.get(p.id) === "unavailable"),
    },
    {
      label: "No Reply",
      status: "noReply",
      color: "text-slate-400",
      dotColor: "bg-slate-300",
      items: players.filter((p) => !responseMap.has(p.id)),
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        if (section.items.length === 0) return null;
        return (
          <div key={section.label}>
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className={`w-2 h-2 rounded-full ${section.dotColor}`} />
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${section.color}`}
              >
                {section.label} ({section.items.length})
              </span>
            </div>
            <div className="bg-white rounded-xl overflow-hidden divide-y divide-gray-50 px-3">
              {section.items.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  isYou={player.id === CURRENT_USER_ID}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
