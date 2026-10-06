export type Gender = "M" | "F";
export type SessionPlayerStatus = "ACTIVE" | "NOT_ARRIVED" | "PAUSED" | "LEFT";
export interface PlayerProfile {
  id: string;
  name: string;
  gender: Gender;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface SessionPlayer {
  playerId: string;
  status: SessionPlayerStatus;
  joinedAtRound: number;
  leftAtRound?: number;
  totalGames: number;
  eligibleRounds: number;
  restRounds: number;
  currentRestStreak: number;
  consecutiveGames: number;
  partnerHistory: Record<string, number>;
  opponentHistory: Record<string, number>;
  fixedPartnerId?: string;
}
export interface Team {
  playerIds: [string, string];
}
export interface Match {
  court: number;
  teamA: Team;
  teamB: Team;
}
export interface RoundSchedule {
  roundNumber: number;
  estimatedStart?: string;
  estimatedEnd?: string;
  matches: Match[];
  restingPlayerIds: string[];
  // Historical availability/locks must survive later roster changes.
  eligiblePlayerIds?: string[];
  fixedPairs?: [string, string][];
}
export interface ScoreBreakdown {
  total: number;
  gameBalance: number;
  restFairness: number;
  partnerDiversity: number;
  opponentDiversity: number;
  consecutive: number;
}
export interface ScheduleBlock {
  id: string;
  startTime: string;
  durationMinutes: number;
  courtCount: 1 | 2;
  courtNames?: string[];
  pointsPerGame: number;
  plannedRounds: number;
  rounds: RoundSchedule[];
  originalGeneratedRounds: RoundSchedule[];
  score: ScoreBreakdown;
  // Persist diagnostics and seed alongside the plan for reproducible support.
  warnings?: string[];
  generationSeed?: number;
  baselinePlayers?: SessionPlayer[];
  undoHistory?: {
    rounds: RoundSchedule[];
    score: ScoreBreakdown;
    warnings?: string[];
  }[];
  manuallyModified: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface Session {
  id: string;
  date: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
  playerIds: string[];
  sessionPlayers: Record<string, SessionPlayer>;
  blocks: ScheduleBlock[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  playerProfiles?: Record<string, PlayerProfile>;
}
export type ManualChange =
  | {
      id: string;
      type: "SWAP";
      blockId: string;
      roundNumber: number;
      playerA: string;
      playerB: string;
      createdAt: string;
    }
  | {
      id: string;
      type: "REPLACE";
      blockId: string;
      roundNumber: number;
      playingPlayer: string;
      restingPlayer: string;
      createdAt: string;
    };
export function freshSessionPlayer(playerId: string): SessionPlayer {
  return {
    playerId,
    status: "ACTIVE",
    joinedAtRound: 1,
    totalGames: 0,
    eligibleRounds: 0,
    restRounds: 0,
    currentRestStreak: 0,
    consecutiveGames: 0,
    partnerHistory: {},
    opponentHistory: {},
  };
}
export function isEligible(player: SessionPlayer, round: number) {
  return (
    player.status === "ACTIVE" &&
    player.joinedAtRound <= round &&
    (player.leftAtRound === undefined || round < player.leftAtRound)
  );
}
export function eligibleInRound(player: SessionPlayer, round: RoundSchedule) {
  return round.eligiblePlayerIds
    ? round.eligiblePlayerIds.includes(player.playerId)
    : isEligible(player, round.roundNumber);
}
