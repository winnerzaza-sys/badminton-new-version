import {
  isEligible,
  type PlayerProfile,
  type SessionPlayer,
  type Match,
  type RoundSchedule,
} from "../models";
import { validateMatch, validateRound } from "./validator";
import { scoreSchedule, selectionPriority } from "./scoring";
import { balanceCourts } from "./courts";
export function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function combinations<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  function visit(start: number, picked: T[]) {
    if (picked.length === size) {
      result.push(picked);
      return;
    }
    for (let i = start; i <= items.length - (size - picked.length); i++)
      visit(i + 1, [...picked, items[i]]);
  }
  visit(0, []);
  return result;
}
function matchLayouts(
  ids: string[],
  profiles: PlayerProfile[],
  court: number,
): Match[] {
  return [1, 2, 3]
    .map((i) => ({
      court,
      teamA: { playerIds: [ids[0], ids[i]] as [string, string] },
      teamB: {
        playerIds: ids.filter((_, j) => j !== 0 && j !== i) as [string, string],
      },
    }))
    .filter((m) => !validateMatch(m, profiles).length);
}
function layouts(
  ids: string[],
  profiles: PlayerProfile[],
  players: SessionPlayer[],
  courtCount: number,
  firstOnly = false,
): Match[][] {
  const result: Match[][] = [];
  const splits =
    courtCount === 1
      ? [ids]
      : combinations(ids.slice(1), 3).map((t) => [ids[0], ...t]);
  for (const first of splits) {
    const remaining = ids.filter((id) => !first.includes(id));
    for (const a of matchLayouts(first, profiles, 1))
      for (const b of courtCount === 1
        ? [undefined]
        : matchLayouts(remaining, profiles, 2)) {
        const matches = b ? [a, b] : [a];
        if (
          players.every(
            (p) =>
              !p.fixedPartnerId ||
              !ids.includes(p.playerId) ||
              !ids.includes(p.fixedPartnerId) ||
              matches.some((m) =>
                [m.teamA, m.teamB].some(
                  (t) =>
                    t.playerIds.includes(p.playerId) &&
                    t.playerIds.includes(p.fixedPartnerId!),
                ),
              ),
          )
        ) {
          result.push(matches);
          if (firstOnly) return result;
        }
      }
  }
  return result;
}
interface Option {
  ids: string[];
  matches: Match[];
}
const optionCache = new Map<string, Option[]>();
function roundOptions(
  profiles: PlayerProfile[],
  players: SessionPlayer[],
  courts: number,
): Option[] {
  const key = JSON.stringify([
    profiles.map((p) => [p.id, p.gender]),
    players.map((p) => [p.playerId, p.fixedPartnerId]),
    courts,
  ]);
  const cached = optionCache.get(key);
  if (cached) return cached;
  const options: Option[] = [];
  for (const ids of combinations(
    players.map((p) => p.playerId),
    courts * 4,
  )) {
    const choices = layouts(ids, profiles, players, courts, true);
    if (choices.length) options.push({ ids, matches: choices[0] });
  }
  // Keep a bounded cache for long-running sessions with changing rosters.
  if (optionCache.size >= 24)
    optionCache.delete(optionCache.keys().next().value!);
  optionCache.set(key, options);
  return options;
}
export interface GenerateInput {
  profiles: PlayerProfile[];
  players: SessionPlayer[];
  courtCount: 1 | 2;
  roundCount: number;
  seed: number;
  startRound?: number;
  iterations?: number;
}
export function generateSchedule(input: GenerateInput) {
  const { profiles, players, courtCount, roundCount, seed } = input;
  const start = input.startRound ?? 1;
  if (!Number.isInteger(roundCount) || roundCount < 1 || roundCount > 30)
    throw new Error("จำนวนรอบต้องอยู่ระหว่าง 1–30");
  const random = seededRandom(seed);
  const ids = players.map((p) => p.playerId);
  if (
    new Set(ids).size !== ids.length ||
    new Set(profiles.map((p) => p.id)).size !== profiles.length ||
    ids.some((id) => !profiles.some((p) => p.id === id))
  )
    throw new Error("ข้อมูลผู้เล่นซ้ำหรือไม่ครบ");
  const eligible = Array.from({ length: roundCount }, (_, r) =>
    players.filter((p) => isEligible(p, start + r)),
  );
  const options = eligible.map((ps) => roundOptions(profiles, ps, courtCount));
  if (options.some((o) => !o.length))
    throw new Error(
      "จัดตารางไม่ได้: ผู้เล่นที่พร้อมเล่นหรือสัดส่วนเพศไม่เพียงพอตามกฎ ลองใช้ 1 สนามหรือปรับรายชื่อ",
    );
  const toRound = (option: Option, r: number): RoundSchedule => ({
    roundNumber: start + r,
    matches: structuredClone(option.matches),
    restingPlayerIds: eligible[r]
      .map((p) => p.playerId)
      .filter((id) => !option.ids.includes(id)),
  });
  let best: RoundSchedule[] | undefined;
  let bestResult: ReturnType<typeof scoreSchedule> | undefined;
  function consider(rounds: RoundSchedule[]) {
    const result = scoreSchedule(rounds, players);
    if (
      !bestResult ||
      result.metrics.participationRateSpread <
        bestResult.metrics.participationRateSpread - 0.000001 ||
      (Math.abs(
        result.metrics.participationRateSpread -
          bestResult.metrics.participationRateSpread,
      ) < 0.000001 &&
        result.score.total > bestResult.score.total)
    ) {
      best = rounds;
      bestResult = result;
    }
  }
  const staticRoster =
    eligible.every(
      (ps) =>
        ps.length === eligible[0].length &&
        ps.every((p, i) => p.playerId === eligible[0][i].playerId),
    ) &&
    eligible[0].every(
      (p) => p.eligibleRounds === eligible[0][0].eligibleRounds,
    );
  // Search a complete block against floor/ceil final quotas. Backtracking provides
  // look-ahead rather than committing permanently to the best next round.
  if (staticRoster)
    for (let attempt = 0; attempt < 12; attempt++) {
      const ps = eligible[0].filter((p) =>
          options[0].some((o) => o.ids.includes(p.playerId)),
        ),
        slots = roundCount * courtCount * 4,
        baseGames = ps.reduce((s, p) => s + p.totalGames, 0),
        floor = Math.floor((slots + baseGames) / ps.length),
        extra = (slots + baseGames) % ps.length;
      const shuffled = [...ps];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const quotas = new Map(
        shuffled.map((p, i) => [
          p.playerId,
          floor + (i < extra ? 1 : 0) - p.totalGames,
        ]),
      );
      if ([...quotas.values()].some((q) => q < 0 || q > roundCount)) continue;
      let nodes = 0;
      function search(r: number): RoundSchedule[] | undefined {
        if (r === roundCount) return [];
        if (++nodes > 100) return undefined;
        const remaining = roundCount - r;
        const fits = (o: Option) =>
          o.ids.every((id) => quotas.get(id)! > 0) &&
          ps.every(
            (p) =>
              quotas.get(p.playerId)! <=
              remaining - (o.ids.includes(p.playerId) ? 0 : 1),
          );
        let candidates: Option[] = [];
        const seen = new Set<Option>();
        for (let k = 0; k < 120; k++) {
          const o = options[r][Math.floor(random() * options[r].length)];
          if (!seen.has(o) && fits(o)) {
            seen.add(o);
            candidates.push(o);
          }
        }
        if (candidates.length < 4) candidates = options[r].filter(fits);
        const ranked = candidates
          .map((o) => ({
            o,
            value:
              o.ids.reduce((s, id) => s + quotas.get(id)!, 0) + random() * 1.5,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 16);
        for (const { o } of ranked) {
          o.ids.forEach((id) => quotas.set(id, quotas.get(id)! - 1));
          const tail = search(r + 1);
          o.ids.forEach((id) => quotas.set(id, quotas.get(id)! + 1));
          if (tail) return [toRound(o, r), ...tail];
        }
        return undefined;
      }
      const rounds = search(0);
      if (rounds) {
        consider(rounds);
        break;
      }
    }
  // Also handles staggered availability and structurally unbalanced rosters.
  for (let attempt = 0; attempt < (best ? 2 : 12); attempt++) {
    const rounds: RoundSchedule[] = [];
    let projected = structuredClone(players);
    for (let r = 0; r < roundCount; r++) {
      const active = projected.filter((p) => isEligible(p, start + r));
      const rate = (courtCount * 4) / active.length;
      const priorities = new Map(
        active.map((p) => [p.playerId, selectionPriority(p, rate)]),
      );
      const sampled = Array.from(
        { length: Math.min(150, options[r].length) },
        () => options[r][Math.floor(random() * options[r].length)],
      );
      const ranked = sampled.map((o) => ({
        o,
        value:
          o.ids.reduce((s, id) => s + priorities.get(id)!, 0) + random() * 0.6,
      }));
      ranked.sort((a, b) => b.value - a.value);
      rounds.push(toRound(ranked[0].o, r));
      projected = scoreSchedule(rounds, players).projectedPlayers;
    }
    consider(rounds);
  }
  // Improve the completed block, including two-round membership exchanges and
  // team rearrangements. Every proposal is checked and rescored as a whole.
  for (let iteration = 0; iteration < (input.iterations ?? 80); iteration++) {
    const proposal = structuredClone(best!);
    const r = Math.floor(random() * roundCount);
    if (iteration % 3 === 0 && roundCount > 1) {
      const s = Math.floor(random() * roundCount);
      if (s === r) continue;
      const playing = (round: RoundSchedule) =>
        round.matches.flatMap((m) => [
          ...m.teamA.playerIds,
          ...m.teamB.playerIds,
        ]);
      const a = playing(proposal[r]),
        b = playing(proposal[s]),
        onlyA = a.filter((id) => !b.includes(id)),
        onlyB = b.filter((id) => !a.includes(id));
      if (!onlyA.length || !onlyB.length) continue;
      const x = onlyA[Math.floor(random() * onlyA.length)],
        y = onlyB[Math.floor(random() * onlyB.length)];
      for (const index of [r, s]) {
        for (const match of proposal[index].matches)
          for (const team of [match.teamA, match.teamB])
            team.playerIds = team.playerIds.map((id) =>
              id === x ? y : id === y ? x : id,
            ) as [string, string];
        proposal[index].restingPlayerIds = proposal[index].restingPlayerIds.map(
          (id) => (id === x ? y : id === y ? x : id),
        );
      }
    } else {
      const playing = proposal[r].matches.flatMap((m) => [
        ...m.teamA.playerIds,
        ...m.teamB.playerIds,
      ]);
      const alternatives = layouts(playing, profiles, eligible[r], courtCount);
      proposal[r].matches =
        alternatives[Math.floor(random() * alternatives.length)];
    }
    if (
      proposal.every(
        (round) => !validateRound(round, profiles, players, courtCount).length,
      )
    )
      consider(proposal);
  }
  const result = bestResult!;
  const blocked = players.filter(
    (p) =>
      eligible.some((ps) => ps.some((x) => x.playerId === p.playerId)) &&
      !options.some((os) => os.some((o) => o.ids.includes(p.playerId))),
  );
  return {
    rounds: balanceCourts(best!),
    ...result,
    warnings: [
      ...blocked.map(
        (p) =>
          `${profiles.find((x) => x.id === p.playerId)?.name}: ไม่สามารถลงสนามได้ภายใต้สัดส่วนเพศหรือคู่ล็อกนี้`,
      ),
      ...(result.metrics.gameCountSpread > 1 && staticRoster
        ? ["จำนวนเกมต่างกันมากกว่า 1 เกมภายใต้ข้อจำกัดหรือขอบเขตการค้นหานี้"]
        : []),
    ],
  };
}
