import { describe, expect, it } from "vitest";
import {
  freshSessionPlayer,
  type RoundSchedule,
} from "../../src/domain/models";
import { playingStreaks } from "../../src/domain/pairing/streaks";

function round(number: number, ids: string[]): RoundSchedule {
  return {
    roundNumber: number,
    matches: [
      {
        court: 1,
        teamA: { playerIds: [ids[0], ids[1]] },
        teamB: { playerIds: [ids[2], ids[3]] },
      },
    ],
    restingPlayerIds: [],
  };
}

describe("planned playing streaks", () => {
  it("counts through team/court changes and resets on any non-playing round", () => {
    const rounds = [
      round(1, ["a", "b", "c", "d"]),
      round(2, ["c", "a", "d", "b"]),
      round(3, ["b", "c", "d", "late"]),
      round(4, ["a", "b", "c", "late"]),
    ];
    const before = structuredClone(rounds);
    const result = playingStreaks(rounds);
    expect(result[2]).toEqual({ a: 2, b: 2, c: 2, d: 2 });
    expect(result[3]).toEqual({ b: 3, c: 3, d: 3, late: 1 });
    expect(result[4]).toEqual({ a: 1, b: 4, c: 4, late: 2 });
    expect(rounds).toEqual(before);
  });

  it("carries previous-block streaks without mutating baseline and recalculates edits", () => {
    const baseline = [freshSessionPlayer("a")];
    baseline[0].consecutiveGames = 3;
    const rounds = [
      round(7, ["a", "b", "c", "d"]),
      round(8, ["a", "b", "c", "d"]),
    ];
    expect(playingStreaks(rounds, baseline)[8].a).toBe(5);
    const edited = structuredClone(rounds);
    edited[0].matches[0].teamA.playerIds[0] = "replacement";
    expect(playingStreaks(edited, baseline)[8].a).toBe(1);
    expect(baseline[0].consecutiveGames).toBe(3);
    expect(playingStreaks(rounds)[7].a).toBe(1);
  });
});
