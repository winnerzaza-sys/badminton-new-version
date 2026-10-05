import { expect, it } from "vitest";
import { balanceCourts } from "../../src/domain/pairing/courts";
import { generateSchedule } from "../../src/domain/pairing/engine";
import { scoreSchedule } from "../../src/domain/pairing/scoring";
import {
  freshSessionPlayer,
  type RoundSchedule,
} from "../../src/domain/models";
import { profiles } from "../fixtures";

function courtCounts(rounds: RoundSchedule[], id: string) {
  return [1, 2].map(
    (court) =>
      rounds.filter((r) =>
        r.matches.some(
          (m) =>
            m.court === court &&
            [...m.teamA.playerIds, ...m.teamB.playerIds].includes(id),
        ),
      ).length,
  );
}
it("rotates repeated groups equally without altering pairing, rest, metadata or scores", () => {
  const ps = profiles("MMMMMMMMMM"),
    players = ps.map((p) => freshSessionPlayer(p.id));
  const rounds: RoundSchedule[] = Array.from({ length: 6 }, (_, i) => ({
    roundNumber: i + 1,
    estimatedStart: "saved-time",
    eligiblePlayerIds: ps.map((p) => p.id),
    fixedPairs: [["p0", "p1"]],
    restingPlayerIds: ["p8", "p9"],
    matches: [
      {
        court: 1,
        teamA: { playerIds: ["p0", "p1"] },
        teamB: { playerIds: ["p2", "p3"] },
      },
      {
        court: 2,
        teamA: { playerIds: ["p4", "p5"] },
        teamB: { playerIds: ["p6", "p7"] },
      },
    ],
  }));
  const before = structuredClone(rounds),
    result = balanceCourts(rounds);
  expect(rounds).toEqual(before);
  for (const p of ps.slice(0, 8))
    expect(courtCounts(result, p.id)).toEqual([3, 3]);
  result.forEach((r, i) => {
    expect({ ...r, matches: [] }).toEqual({ ...rounds[i], matches: [] });
    expect(
      r.matches.map((m) => JSON.stringify([m.teamA, m.teamB])).sort(),
    ).toEqual(
      rounds[i].matches.map((m) => JSON.stringify([m.teamA, m.teamB])).sort(),
    );
  });
  expect(scoreSchedule(result, players)).toEqual(
    scoreSchedule(rounds, players),
  );
  expect(balanceCourts(rounds)).toEqual(result);
});
it("balances generated one-hour schedules across roster sizes and seeds", () => {
  for (let n = 10; n <= 15; n++)
    for (let seed = 0; seed < 10; seed++) {
      const ps = profiles("M".repeat(n));
      const result = generateSchedule({
        profiles: ps,
        players: ps.map((p) => freshSessionPlayer(p.id)),
        courtCount: 2,
        roundCount: 6,
        seed,
      });
      const monopolyCount = (rounds: RoundSchedule[]) =>
        ps.filter((p) => {
          const counts = courtCounts(rounds, p.id);
          return counts[0] + counts[1] >= 2 && Math.min(...counts) === 0;
        }).length;
      // Independently enumerate every labeling: a few pairings cannot rotate
      // everyone simultaneously, so verify the actual attainable minimum.
      let optimum = Infinity;
      for (let mask = 0; mask < 64; mask++) {
        const alternative = structuredClone(result.rounds);
        alternative.forEach((r, i) => {
          if (mask & (1 << i))
            r.matches.forEach((m) => {
              m.court = 3 - m.court;
            });
        });
        optimum = Math.min(optimum, monopolyCount(alternative));
      }
      expect(monopolyCount(result.rounds)).toBe(optimum);
    }
});
it("preserves one-court rounds and balances unusually long blocks deterministically", () => {
  const ps = profiles("MMMMMMMM"),
    players = ps.map((p) => freshSessionPlayer(p.id));
  const two = generateSchedule({
    profiles: ps,
    players,
    courtCount: 2,
    roundCount: 14,
    seed: 4,
  }).rounds;
  for (const p of ps)
    expect(Math.min(...courtCounts(two, p.id))).toBeGreaterThan(0);
  expect(balanceCourts(two)).toEqual(balanceCourts(two));
  const one = generateSchedule({
    profiles: ps,
    players,
    courtCount: 1,
    roundCount: 6,
    seed: 4,
  }).rounds;
  expect(balanceCourts(one)).toEqual(one);
});
