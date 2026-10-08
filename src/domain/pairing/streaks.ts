import type { RoundSchedule, SessionPlayer } from "../models";

// Derived from the current plan, so swaps, undo and regeneration cannot leave
// stale badges. Baseline streaks carry the preceding block's planned games.
export function playingStreaks(
  rounds: RoundSchedule[],
  baseline: SessionPlayer[] = [],
): Record<number, Record<string, number>> {
  let previous = Object.fromEntries(
    baseline.map((p) => [p.playerId, p.consecutiveGames]),
  );
  const result: Record<number, Record<string, number>> = {};
  for (const round of rounds) {
    const playing = new Set(
      round.matches.flatMap((m) => [
        ...m.teamA.playerIds,
        ...m.teamB.playerIds,
      ]),
    );
    const current = Object.fromEntries(
      [...playing].map((id) => [id, (previous[id] ?? 0) + 1]),
    );
    result[round.roundNumber] = current;
    // Resting, paused, not-arrived and departed players all break their streak.
    previous = current;
  }
  return result;
}
