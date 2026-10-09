import { describe, it, expect } from "vitest";
import { profiles } from "../fixtures";
import {
  createSession,
  generateBlock,
  defaultConfig,
} from "../../src/features/session/service";
import {
  swapPlayers,
  undoEdit,
  resetGenerated,
  changeAvailability,
  addLatePlayer,
  setFixedPair,
  regenerateRemaining,
  projectBlock,
  archiveSession,
  validateBlock,
} from "../../src/features/schedule/service";
import { validateRound } from "../../src/domain/pairing/validator";
import { hydrateSession } from "../../src/features/session/hydrate";
function fixture(genders = "MMMMMMMMMMMM") {
  const ps = profiles(genders),
    config = { ...defaultConfig(), plannedRounds: 10 };
  const s = createSession(
    ps.map((p) => p.id),
    config,
  );
  s.status = "ACTIVE";
  s.playerProfiles = Object.fromEntries(ps.map((p) => [p.id, p]));
  s.blocks = [generateBlock(s, ps, config, 17)];
  return { ps, s, b: s.blocks[0] };
}
describe("manual changes", () => {
  it("swaps/replaces, scores, persists undo snapshots and resets without mutating originals", () => {
    const { ps, s, b } = fixture();
    const before = structuredClone(b),
      r = b.rounds[0],
      a = r.matches[0].teamA.playerIds[0],
      rest = r.restingPlayerIds[0];
    const edit = swapPlayers(s, b, ps, 0, a, rest);
    expect(edit.rounds[0].restingPlayerIds).toContain(a);
    expect(
      edit.rounds[0].matches.flatMap((m) => [
        ...m.teamA.playerIds,
        ...m.teamB.playerIds,
      ]),
    ).toContain(rest);
    expect(edit.undoHistory).toHaveLength(1);
    expect(b).toEqual(before);
    expect(undoEdit(s, edit, ps).rounds).toEqual(b.rounds);
    expect(resetGenerated(s, edit, ps, 0).rounds).toEqual(b.rounds);
    expect(edit.score).toEqual(projectBlock(s, edit).score);
  });
  it("allows manual 3M1F and MM vs FF while automatic validation stays strict", () => {
    const { ps, s, b } = fixture("MMMMFFFF");
    const round = {
      ...b.rounds[0],
      matches: [
        {
          court: 1,
          teamA: { playerIds: ["p0", "p4"] as [string, string] },
          teamB: { playerIds: ["p1", "p5"] as [string, string] },
        },
        {
          court: 2,
          teamA: { playerIds: ["p2", "p6"] as [string, string] },
          teamB: { playerIds: ["p3", "p7"] as [string, string] },
        },
      ],
    };
    b.rounds[0] = round;
    const before = structuredClone(b);
    for (const other of ["p2", "p1"]) {
      const edit = swapPlayers(s, b, ps, 0, "p4", other);
      expect(edit.rounds[0].manualGenderOverride).toBe(true);
      expect(() => validateBlock(s, edit, ps)).not.toThrow();
      // Generator/default validator still rejects either gender combination.
      expect(validateRound(edit.rounds[0], ps, b.baselinePlayers!)).not.toEqual(
        [],
      );
      expect(b).toEqual(before);
      expect(undoEdit(s, edit, ps).rounds).toEqual(b.rounds);
      expect(resetGenerated(s, edit, ps, 0).rounds).toEqual(
        b.originalGeneratedRounds,
      );
      const persisted = hydrateSession(
        JSON.parse(JSON.stringify({ ...s, blocks: [edit] })),
        ps,
      );
      expect(() =>
        validateBlock(persisted, persisted.blocks[0], ps),
      ).not.toThrow();
      const next = swapPlayers(
        s,
        edit,
        ps,
        1,
        edit.rounds[1].matches[0].teamA.playerIds[0],
        edit.rounds[1].matches[0].teamA.playerIds[1],
      );
      expect(next.rounds[0]).toEqual(edit.rounds[0]);
      const regenerated = regenerateRemaining(s, edit, ps, 1, 31);
      expect(regenerated.rounds[0]).toEqual(edit.rounds[0]);
      for (const r of regenerated.rounds.slice(1)) {
        expect(r.manualGenderOverride).toBeUndefined();
        expect(validateRound(r, ps, b.baselinePlayers!)).toEqual([]);
      }
    }
  });
  it("respects locked pairs; unlock is explicit; completed sessions reject changes", () => {
    const { ps, s, b } = fixture();
    const pair = b.rounds[0].matches[0].teamA.playerIds;
    const locked = setFixedPair(s, ps, 0, 0, pair[0], pair[1], 9),
      r = locked.blocks[0].rounds.find((r) =>
        r.matches.some(
          (m) =>
            (m.teamA.playerIds.includes(pair[0]) &&
              m.teamA.playerIds.includes(pair[1])) ||
            (m.teamB.playerIds.includes(pair[0]) &&
              m.teamB.playerIds.includes(pair[1])),
        ),
      )!;
    const index = locked.blocks[0].rounds.indexOf(r),
      other = r.matches
        .flatMap((m) => [...m.teamA.playerIds, ...m.teamB.playerIds])
        .find((id) => !pair.includes(id))!;
    expect(() =>
      swapPlayers(locked, locked.blocks[0], ps, index, pair[0], other),
    ).toThrow("คู่ที่ล็อก");
    const unlocked = setFixedPair(locked, ps, 0, index, pair[0], undefined, 11);
    expect(unlocked.sessionPlayers[pair[0]].fixedPartnerId).toBeUndefined();
    locked.status = "COMPLETED";
    expect(() =>
      swapPlayers(locked, locked.blocks[0], ps, index, pair[0], other),
    ).toThrow("จบแล้ว");
  });
});
describe("historical availability", () => {
  it("archives projected counters without duplicating baseline history or mutating the active session", () => {
    const { s, b } = fixture(),
      before = structuredClone(s),
      expected = projectBlock(s, b).projectedPlayers,
      archived = archiveSession(s, "2026-10-05T11:00:00Z");
    expect(s).toEqual(before);
    expect(archived.status).toBe("COMPLETED");
    expect(
      Object.values(archived.sessionPlayers).map((p) => p.totalGames),
    ).toEqual(expected.map((p) => p.totalGames));
    expect(
      projectBlock(archived, archived.blocks[0]).projectedPlayers.map(
        (p) => p.totalGames,
      ),
    ).toEqual(expected.map((p) => p.totalGames));
  });
  it("late join after round 3 gets seven opportunities and preserves prefix", () => {
    const { ps, s, b } = fixture("MMMMMMMMMM");
    const extra = profiles("MMMMMMMMMMM")[10];
    const next = addLatePlayer(s, [...ps, extra], 0, 3, extra.id, 17);
    expect(next.blocks[0].rounds.slice(0, 3)).toEqual(b.rounds.slice(0, 3));
    expect(
      projectBlock(next, next.blocks[0]).projectedPlayers.find(
        (p) => p.playerId === extra.id,
      )?.eligibleRounds,
    ).toBe(7);
    validateBlock(next, next.blocks[0], [...ps, extra]);
  });
  it("pause two rounds then resume then leave keeps opportunities and prior history", () => {
    const { ps, s, b } = fixture();
    const paused = changeAvailability(s, ps, 0, 3, "p0", "PAUSED", 3),
      resumed = changeAvailability(paused, ps, 0, 5, "p0", "ACTIVE", 4),
      left = changeAvailability(resumed, ps, 0, 8, "p0", "LEFT", 5);
    expect(left.blocks[0].rounds.slice(0, 3)).toEqual(b.rounds.slice(0, 3));
    const p = projectBlock(left, left.blocks[0]).projectedPlayers.find(
      (p) => p.playerId === "p0",
    )!;
    expect(p.eligibleRounds).toBe(6);
    expect(
      left.blocks[0].rounds
        .slice(8)
        .every((r) => !r.eligiblePlayerIds!.includes("p0")),
    ).toBe(true);
    expect(() => changeAvailability(left, ps, 0, 9, "p0", "ACTIVE", 6)).toThrow(
      "ออกแล้ว",
    );
    validateBlock(left, left.blocks[0], ps);
  });
  it("switches future rounds to one court when only seven players remain; errors roll back below four", () => {
    const { ps, s, b } = fixture("MMMMMMMM");
    const next = changeAvailability(s, ps, 0, 3, "p0", "LEFT", 2);
    expect(next.blocks[0].rounds.slice(0, 3)).toEqual(b.rounds.slice(0, 3));
    expect(
      next.blocks[0].rounds.slice(3).every((r) => r.matches.length === 1),
    ).toBe(true);
    expect(next.blocks[0].warnings?.join()).toContain("1 สนาม");
    validateBlock(next, next.blocks[0], ps);
    let current = next;
    for (const id of ["p1", "p2", "p3"])
      current = changeAvailability(current, ps, 0, 3, id, "LEFT", 3);
    const before = structuredClone(current);
    expect(() =>
      changeAvailability(current, ps, 0, 3, "p4", "LEFT", 4),
    ).toThrow("จัดตารางไม่ได้");
    expect(current).toEqual(before);
  });
  it("regenerates only the remaining tail and upgrades earlier saved records", () => {
    const { ps, s, b } = fixture();
    delete b.baselinePlayers;
    for (const r of b.rounds) {
      delete r.eligiblePlayerIds;
      delete r.fixedPairs;
    }
    const upgraded = hydrateSession(s, ps),
      next = regenerateRemaining(upgraded, upgraded.blocks[0], ps, 4, 89);
    expect(next.rounds.slice(0, 4)).toEqual(
      upgraded.blocks[0].rounds.slice(0, 4),
    );
    expect(upgraded.blocks[0].baselinePlayers).toHaveLength(12);
  });
});
