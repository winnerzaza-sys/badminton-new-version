import { it, expect } from "vitest";
import { profiles } from "../fixtures";
import { freshSessionPlayer } from "../../src/domain/models";
import { generateSchedule } from "../../src/domain/pairing/engine";
import { scoreSchedule } from "../../src/domain/pairing/scoring";
import { validateRound } from "../../src/domain/pairing/validator";
it("reproduces the same full block with a seed and respects fixed pairs across courts", () => {
  const ps = profiles("MFMFMFMFMFMF"),
    players = ps.map((p) => freshSessionPlayer(p.id));
  players[0].fixedPartnerId = "p1";
  players[8].fixedPartnerId = "p9";
  const input = {
    profiles: ps,
    players,
    courtCount: 2 as const,
    roundCount: 10,
    seed: 671,
  };
  const before = structuredClone(input);
  const result = generateSchedule(input);
  expect(generateSchedule(input)).toEqual(result);
  expect(input).toEqual(before);
  for (const round of result.rounds)
    expect(validateRound(round, ps, players, 2)).toEqual([]);
});
it("a voluntary pause breaks streaks without awarding engine rest, then permits resumption", () => {
  const ps = profiles("MMMMM"),
    players = ps.map((p) => freshSessionPlayer(p.id));
  players[4] = {
    ...players[4],
    status: "PAUSED",
    totalGames: 4,
    eligibleRounds: 8,
    restRounds: 4,
    currentRestStreak: 3,
    consecutiveGames: 0,
  };
  const paused = generateSchedule({
    profiles: ps,
    players,
    courtCount: 1,
    roundCount: 2,
    seed: 7,
    startRound: 9,
  });
  const p = paused.projectedPlayers[4];
  expect(p.eligibleRounds).toBe(8);
  expect(p.restRounds).toBe(4);
  expect(p.currentRestStreak).toBe(0);
  p.status = "ACTIVE";
  const resumed = generateSchedule({
    profiles: ps,
    players: paused.projectedPlayers,
    courtCount: 1,
    roundCount: 3,
    seed: 8,
    startRound: 11,
  });
  expect(resumed.projectedPlayers[4].eligibleRounds).toBe(11);
});
it("uses participation rates for a player joining after round three", () => {
  const ps = profiles("MMMMMMMMMMM"),
    players = ps.map((p) => freshSessionPlayer(p.id));
  players[10].joinedAtRound = 4;
  const result = generateSchedule({
    profiles: ps,
    players,
    courtCount: 2,
    roundCount: 10,
    seed: 27,
  });
  expect(result.projectedPlayers[10].eligibleRounds).toBe(7);
  expect(result.projectedPlayers[10].totalGames).toBeLessThanOrEqual(6);
  expect(result.metrics.participationRateSpread).toBeLessThanOrEqual(0.2);
});
it("rejects an invalid manual replacement without changing the proposed input", () => {
  const ps = profiles("MMMMF"),
    players = ps.map((p) => freshSessionPlayer(p.id)),
    round = {
      roundNumber: 1,
      matches: [
        {
          court: 1,
          teamA: { playerIds: ["p0", "p1"] as [string, string] },
          teamB: { playerIds: ["p2", "p4"] as [string, string] },
        },
      ],
      restingPlayerIds: ["p3"],
    };
  const before = structuredClone(round);
  expect(validateRound(round, ps, players, 1)).toContain(
    "ไม่อนุญาตให้จัดชาย 3 คน หญิง 1 คน",
  );
  expect(round).toEqual(before);
});
