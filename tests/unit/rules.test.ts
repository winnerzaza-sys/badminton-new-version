import { describe, it, expect } from "vitest";
import {
  freshSessionPlayer,
  type PlayerProfile,
  type RoundSchedule,
} from "../../src/domain/models";
import {
  validateMatch,
  validateRound,
} from "../../src/domain/pairing/validator";
import { generateSchedule } from "../../src/domain/pairing/engine";
import {
  consecutivePenalty,
  partnerPenalty,
  opponentPenalty,
  selectionPriority,
  scoreSchedule,
  scoreWeights,
} from "../../src/domain/pairing/scoring";
import { profiles } from "../fixtures";
const match = {
  court: 1,
  teamA: { playerIds: ["p0", "p1"] as [string, string] },
  teamB: { playerIds: ["p2", "p3"] as [string, string] },
};
describe("hard rules", () => {
  it.each([
    ["MMMM", true],
    ["MFMF", true],
    ["MMFF", false],
    ["MFFF", true],
    ["MMMF", false],
    ["FFFF", true],
  ])("%s valid=%s", (genders, valid) =>
    expect(validateMatch(match, profiles(genders)).length === 0).toBe(valid),
  );
  it("rejects duplicate players, courts, ineligible players and missing rest entries", () => {
    const ps = profiles("MMMMMMMMMM"),
      players = ps.map((p) => freshSessionPlayer(p.id));
    const round: RoundSchedule = {
      roundNumber: 1,
      matches: [match, { ...match, court: 2 }],
      restingPlayerIds: [],
    };
    expect(validateRound(round, ps, players)).toContain(
      "ผู้เล่นซ้ำในรอบเดียวกัน",
    );
    expect(validateRound(round, ps, players)).toContain(
      "รายชื่อผู้เล่นที่พร้อมเล่นไม่ครบหรือไม่ถูกต้อง",
    );
    players[0].status = "PAUSED";
    expect(validateRound(round, ps, players).length).toBeGreaterThan(0);
  });
  it("checks a fixed pair across courts and accepts them together", () => {
    const ps = profiles("MMMM"),
      players = ps.map((p) => freshSessionPlayer(p.id));
    players[0].fixedPartnerId = "p2";
    expect(
      validateRound(
        { roundNumber: 1, matches: [match], restingPlayerIds: [] },
        ps,
        players,
      ),
    ).toContain("คู่ที่ล็อกไว้ต้องอยู่ทีมเดียวกัน");
    players[0].fixedPartnerId = "p1";
    expect(
      validateRound(
        { roundNumber: 1, matches: [match], restingPlayerIds: [] },
        ps,
        players,
      ),
    ).toEqual([]);
  });
  it("generates one court and rejects impossible rosters without violating rules", () => {
    const ps = profiles("MMMF");
    expect(() =>
      generateSchedule({
        profiles: ps,
        players: ps.map((p) => freshSessionPlayer(p.id)),
        courtCount: 1,
        roundCount: 6,
        seed: 1,
      }),
    ).toThrow();
    const valid = profiles("MFFFF");
    const result = generateSchedule({
      profiles: valid,
      players: valid.map((p) => freshSessionPlayer(p.id)),
      courtCount: 1,
      roundCount: 6,
      seed: 1,
    });
    expect(result.rounds).toHaveLength(6);
  });
});
describe("scoring and availability", () => {
  it("prioritizes participation deficit without catching a late joiner up", () => {
    const old = {
        ...freshSessionPlayer("old"),
        totalGames: 6,
        eligibleRounds: 8,
      },
      late = freshSessionPlayer("late");
    expect(selectionPriority(old, 0.75)).toBeCloseTo(
      selectionPriority(late, 0.75),
    );
    expect(selectionPriority({ ...old, totalGames: 5 }, 0.75)).toBeGreaterThan(
      selectionPriority(old, 0.75),
    );
    expect(
      selectionPriority(
        { ...late, status: "PAUSED", currentRestStreak: 8 },
        0.75,
      ),
    ).toBe(selectionPriority(late, 0.75));
  });
  it("penalizes partner repetition more and play streaks less with small rosters", () => {
    expect(partnerPenalty(2)).toBeGreaterThan(opponentPenalty(2));
    expect(consecutivePenalty(3, 10)).toBeLessThan(consecutivePenalty(3, 15));
    expect(scoreWeights(10, 2)[0]).toBe(55);
  });
  it("does not mutate baseline, count pause as rest, or restrict consecutive play", () => {
    const ps = profiles("MMMMM"),
      players = ps.map((p) => freshSessionPlayer(p.id));
    players[4].status = "PAUSED";
    const copy = structuredClone(players);
    const rounds = Array.from({ length: 6 }, (_, i) => ({
      roundNumber: i + 1,
      matches: [match],
      restingPlayerIds: [],
    }));
    const result = scoreSchedule(rounds, players);
    expect(players).toEqual(copy);
    expect(result.projectedPlayers[4].eligibleRounds).toBe(0);
    expect(result.projectedPlayers[4].restRounds).toBe(0);
    expect(result.metrics.maxPlayStreak).toBe(6);
    expect(validateRound(rounds[5], ps, players)).toEqual([]);
  });
  it("supports future join and leave boundaries", () => {
    const ps = profiles("MMMMMMMMMMM"),
      players = ps.map((p) => freshSessionPlayer(p.id));
    players[10].joinedAtRound = 4;
    players[9].leftAtRound = 7;
    const result = generateSchedule({
      profiles: ps,
      players,
      courtCount: 2,
      roundCount: 10,
      seed: 99,
    });
    result.rounds.forEach((r) =>
      expect(validateRound(r, ps, players, 2)).toEqual([]),
    );
    expect(result.projectedPlayers[10].eligibleRounds).toBe(7);
    expect(result.projectedPlayers[9].eligibleRounds).toBe(6);
  });
});
