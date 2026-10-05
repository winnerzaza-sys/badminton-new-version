import type { RoundSchedule } from "../models";

/** Court labels are interchangeable: rotate whole matches without changing teams
 * or rest. Court fairness is a tie-break after the specified pairing score. */
export function balanceCourts(rounds: RoundSchedule[]): RoundSchedule[] {
  const result = structuredClone(rounds);
  const indices = rounds.flatMap((r, i) => (r.matches.length === 2 ? [i] : []));
  if (!indices.length) return result;
  const appearances = new Map<string, { index: number; side: number }[]>();
  indices.forEach((r, index) =>
    rounds[r].matches.forEach((match, side) => {
      for (const id of [...match.teamA.playerIds, ...match.teamB.playerIds]) {
        const entries = appearances.get(id) ?? [];
        entries.push({ index, side });
        appearances.set(id, entries);
      }
    }),
  );
  function cost(flips: boolean[]) {
    let unmoved = 0,
      imbalance = 0,
      repeats = 0;
    for (const entries of appearances.values()) {
      const sides = entries.map((e) => e.side ^ Number(flips[e.index]));
      const firstCourt = sides.filter((side) => side === 0).length;
      if (
        entries.length >= 2 &&
        (firstCourt === 0 || firstCourt === entries.length)
      )
        unmoved++;
      imbalance += (2 * firstCourt - entries.length) ** 2;
      repeats += sides.slice(1).filter((side, i) => side === sides[i]).length;
    }
    return [unmoved, imbalance, repeats];
  }
  const better = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
    return false;
  };
  let best = indices.map(() => false),
    bestCost = cost(best);
  // Fix the first label: globally swapping both courts has the same cost.
  if (indices.length <= 12) {
    for (let mask = 1; mask < 2 ** (indices.length - 1); mask++) {
      const flips = indices.map(
        (_, i) => i > 0 && Boolean(mask & (1 << (i - 1))),
      );
      const score = cost(flips);
      if (better(score, bestCost)) {
        best = flips;
        bestCost = score;
      }
    }
  } else {
    // Bounded deterministic search for unusually long blocks.
    for (let start = 0; start < 3; start++) {
      let flips = indices.map((_, i) =>
        start === 1 ? i % 2 === 1 : start === 2 ? i % 3 === 1 : false,
      );
      let score = cost(flips);
      for (let pass = 0; pass < 20; pass++) {
        let changed = false;
        for (let i = 1; i < flips.length; i++) {
          flips[i] = !flips[i];
          const next = cost(flips);
          if (better(next, score)) {
            score = next;
            changed = true;
          } else flips[i] = !flips[i];
        }
        if (!changed) break;
      }
      if (better(score, bestCost)) {
        best = [...flips];
        bestCost = score;
      }
    }
  }
  indices.forEach((r, i) => {
    if (best[i]) result[r].matches.reverse();
    result[r].matches.forEach((match, side) => {
      match.court = side + 1;
    });
  });
  return result;
}
