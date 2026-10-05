import {
  eligibleInRound,
  type SessionPlayer,
  type RoundSchedule,
  type ScoreBreakdown,
} from "../models";
export const partnerPenalty = (count: number) =>
  [0, 10, 25, 45, 60][Math.min(count, 4)];
export const opponentPenalty = (count: number) =>
  [0, 3, 8, 15, 20][Math.min(count, 4)];
export function consecutivePenalty(streak: number, count: number) {
  return count <= 11
    ? [0, 0, 2, 5, 10, 15][Math.min(streak, 5)]
    : count <= 13
      ? [0, 0, 5, 12, 20][Math.min(streak, 4)]
      : [0, 0, 10, 25, 40][Math.min(streak, 4)];
}
export function selectionPriority(player: SessionPlayer, targetRate: number) {
  return (
    targetRate * (player.eligibleRounds + 1) -
    player.totalGames +
    (player.status === "ACTIVE" ? player.currentRestStreak * 0.15 : 0)
  );
}
export function effectiveSpread(players: SessionPlayer[]) {
  const eligible = players.filter((p) => p.eligibleRounds > 0);
  if (!eligible.length) return 0;
  const maxRounds = Math.max(...eligible.map((p) => p.eligibleRounds));
  const normalized = eligible.map(
    (p) => (p.totalGames / p.eligibleRounds) * maxRounds,
  );
  return Math.max(...normalized) - Math.min(...normalized);
}
export function scoreWeights(count: number, spread: number) {
  return spread >= 2
    ? [55, 25, 10, 5, 5]
    : count <= 11
      ? [40, 25, 20, 10, 5]
      : count <= 13
        ? [35, 25, 20, 10, 10]
        : [30, 30, 20, 10, 10];
}
export function scoreSchedule(
  rounds: RoundSchedule[],
  baseline: SessionPlayer[],
): {
  score: ScoreBreakdown;
  projectedPlayers: SessionPlayer[];
  metrics: {
    gameCountSpread: number;
    participationRateSpread: number;
    maxRestStreak: number;
    maxPlayStreak: number;
    partnerRepeats: number;
    opponentRepeats: number;
    partnerRepeatDistribution: Record<string, number>;
    opponentRepeatDistribution: Record<string, number>;
    fairnessRecovery: boolean;
  };
} {
  const state = structuredClone(baseline);
  let restPenalty = 0,
    partners = 0,
    opponents = 0,
    consecutive = 0,
    opportunities = 0,
    teamLinks = 0,
    opponentLinks = 0,
    maxRestStreak = 0,
    maxPlayStreak = 0,
    activeSum = 0;
  for (const round of rounds) {
    const eligible = state.filter((p) => eligibleInRound(p, round));
    for (const p of state)
      if (!eligibleInRound(p, round)) {
        p.currentRestStreak = 0;
        p.consecutiveGames = 0;
      }
    activeSum += eligible.length;
    const playing = new Set(
      round.matches.flatMap((m) => [
        ...m.teamA.playerIds,
        ...m.teamB.playerIds,
      ]),
    );
    for (const p of eligible) {
      p.eligibleRounds++;
      opportunities++;
      if (playing.has(p.playerId)) {
        p.totalGames++;
        p.consecutiveGames++;
        p.currentRestStreak = 0;
        consecutive += consecutivePenalty(p.consecutiveGames, eligible.length);
        maxPlayStreak = Math.max(maxPlayStreak, p.consecutiveGames);
      } else {
        restPenalty += [0, 5, 15, 35][Math.min(p.currentRestStreak, 3)];
        p.restRounds++;
        p.currentRestStreak++;
        p.consecutiveGames = 0;
        maxRestStreak = Math.max(maxRestStreak, p.currentRestStreak);
      }
    }
    for (const match of round.matches)
      for (const [team, other] of [
        [match.teamA, match.teamB],
        [match.teamB, match.teamA],
      ])
        for (const id of team.playerIds) {
          const p = state.find((p) => p.playerId === id)!;
          const partner = team.playerIds.find((x) => x !== id)!;
          partners += partnerPenalty(p.partnerHistory[partner] ?? 0);
          teamLinks++;
          p.partnerHistory[partner] = (p.partnerHistory[partner] ?? 0) + 1;
          for (const rival of other.playerIds) {
            opponents += opponentPenalty(p.opponentHistory[rival] ?? 0);
            opponentLinks++;
            p.opponentHistory[rival] = (p.opponentHistory[rival] ?? 0) + 1;
          }
        }
  }
  const participating = state.filter((p) => p.eligibleRounds > 0),
    spread = effectiveSpread(participating);
  const balance =
    spread <= 1
      ? 100 - 10 * spread
      : spread <= 2
        ? 90 - 35 * (spread - 1)
        : spread <= 3
          ? 55 - 35 * (spread - 2)
          : Math.max(0, 20 - 20 * (spread - 3));
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  const scores = [
    balance,
    clamp(100 - (restPenalty / Math.max(1, opportunities)) * 3),
    clamp(100 - (partners / Math.max(1, teamLinks) / 60) * 100),
    clamp(100 - (opponents / Math.max(1, opponentLinks) / 20) * 100),
    clamp(100 - (consecutive / Math.max(1, opportunities) / 40) * 100),
  ];
  const weights = scoreWeights(activeSum / Math.max(1, rounds.length), spread);
  const games = participating.map((p) => p.totalGames),
    rates = participating.map((p) => p.totalGames / p.eligibleRounds);
  function repetitionStats(field: "partnerHistory" | "opponentHistory") {
    const distribution: Record<string, number> = {};
    let repeats = 0;
    for (const p of state)
      for (const [other, count] of Object.entries(p[field]))
        if (p.playerId < other) {
          distribution[count] = (distribution[count] ?? 0) + 1;
          repeats += Math.max(0, count - 1);
        }
    return { distribution, repeats };
  }
  const partnerStats = repetitionStats("partnerHistory"),
    opponentStats = repetitionStats("opponentHistory");
  return {
    score: {
      total: scores.reduce((sum, s, i) => sum + (s * weights[i]) / 100, 0),
      gameBalance: scores[0],
      restFairness: scores[1],
      partnerDiversity: scores[2],
      opponentDiversity: scores[3],
      consecutive: scores[4],
    },
    projectedPlayers: state,
    metrics: {
      gameCountSpread: games.length
        ? Math.max(...games) - Math.min(...games)
        : 0,
      participationRateSpread: rates.length
        ? Math.max(...rates) - Math.min(...rates)
        : 0,
      maxRestStreak,
      maxPlayStreak,
      partnerRepeats: partnerStats.repeats,
      opponentRepeats: opponentStats.repeats,
      partnerRepeatDistribution: partnerStats.distribution,
      opponentRepeatDistribution: opponentStats.distribution,
      fairnessRecovery: spread >= 2,
    },
  };
}
