export type Player = {
  id: string;
  name: string;
  isAdmin: boolean;
  nominatedTeamIds?: string[]; // Teams this player is nominated for
  teamIds?: string[]; // Teams this player belongs to
};

export type EventType = "match" | "training" | "other";

export type HomeAway = "H" | "A" | null;

export type GameEvent = {
  id: string;
  title: string;
  type: EventType;
  date: string;
  time: string;
  location: string;
  opponent?: string;
  opponentShort?: string;
  homeAway?: HomeAway;
  notes?: string;
  createdBy: string;
  teamId: string;
};

export type AvailabilityStatus = "available" | "unavailable" | "maybe" | null;

export type EventResponse = {
  eventId: string;
  playerId: string;
  status: AvailabilityStatus;
  respondedAt: string;
};

export type ResponseSummary = {
  available: Player[];
  unavailable: Player[];
  maybe: Player[];
  noReply: Player[];
};

export type Team = {
  id: string;
  name: string;
  shortName: string;
  division: string;
  league: string;
  season: string;
};
