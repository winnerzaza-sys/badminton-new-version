import {
  freshSessionPlayer,
  type PlayerProfile,
  type Session,
  type ScheduleBlock,
} from "../../domain/models";
import { generateSchedule } from "../../domain/pairing/engine";
export interface SessionConfig {
  date: string;
  startTime: string;
  durationMinutes: number;
  courtCount: 1 | 2;
  pointsPerGame: number;
  plannedRounds: number;
}
export const defaultConfig = (): SessionConfig => ({
  date: new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
  startTime: "17:00",
  durationMinutes: 60,
  courtCount: 2,
  pointsPerGame: 21,
  plannedRounds: 6,
});
export function createSession(
  playerIds: string[],
  config: SessionConfig,
): Session {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    date: config.date,
    status: "DRAFT",
    playerIds: [...playerIds],
    sessionPlayers: Object.fromEntries(
      playerIds.map((id) => [id, freshSessionPlayer(id)]),
    ),
    blocks: [],
    createdAt: now,
    updatedAt: now,
  };
}
export function previousRoster(sessions: Session[], profiles: PlayerProfile[]) {
  const latest = [...sessions].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )[0];
  return (
    latest?.playerIds.filter((id) =>
      profiles.some((p) => p.id === id && p.active),
    ) ?? []
  );
}
export function generateBlock(
  session: Session,
  profiles: PlayerProfile[],
  config: SessionConfig,
  seed: number,
  startRound = 1,
): ScheduleBlock {
  const result = generateSchedule({
    profiles,
    players: Object.values(session.sessionPlayers),
    courtCount: config.courtCount,
    roundCount: config.plannedRounds,
    seed,
    startRound,
  });
  const start = new Date(
    `${config.date}T${config.startTime}:00+07:00`,
  ).getTime();
  const rounds = result.rounds.map((r, i) => ({
    ...r,
    eligiblePlayerIds: Object.values(session.sessionPlayers)
      .filter(
        (p) =>
          p.status === "ACTIVE" &&
          p.joinedAtRound <= r.roundNumber &&
          (p.leftAtRound === undefined || r.roundNumber < p.leftAtRound),
      )
      .map((p) => p.playerId),
    fixedPairs: Object.values(session.sessionPlayers)
      .filter((p) => p.fixedPartnerId)
      .map((p) => [p.playerId, p.fixedPartnerId!] as [string, string]),
    estimatedStart: new Date(
      start + ((i * config.durationMinutes) / config.plannedRounds) * 60000,
    ).toISOString(),
    estimatedEnd: new Date(
      start +
        (((i + 1) * config.durationMinutes) / config.plannedRounds) * 60000,
    ).toISOString(),
  }));
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    startTime: new Date(start).toISOString(),
    durationMinutes: config.durationMinutes,
    courtCount: config.courtCount,
    pointsPerGame: config.pointsPerGame,
    plannedRounds: config.plannedRounds,
    rounds,
    originalGeneratedRounds: structuredClone(rounds),
    score: result.score,
    warnings: result.warnings,
    generationSeed: seed,
    baselinePlayers: structuredClone(Object.values(session.sessionPlayers)),
    undoHistory: [],
    manuallyModified: false,
    createdAt: now,
    updatedAt: now,
  };
}
