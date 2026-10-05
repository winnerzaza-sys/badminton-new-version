import {
  eligibleInRound,
  type PlayerProfile,
  type SessionPlayer,
  type RoundSchedule,
  type Match,
} from "../models";
export function validateMatch(
  match: Match,
  profiles: PlayerProfile[],
): string[] {
  const ids = [...match.teamA.playerIds, ...match.teamB.playerIds];
  if (ids.length !== 4 || new Set(ids).size !== 4)
    return ["สนามต้องมีผู้เล่นไม่ซ้ำกัน 4 คน"];
  const genders = ids.map((id) => profiles.find((p) => p.id === id)?.gender);
  if (genders.some((g) => !g)) return ["ไม่พบข้อมูลผู้เล่น"];
  const males = genders.filter((g) => g === "M").length;
  if (males === 3) return ["ไม่อนุญาตให้จัดชาย 3 คน หญิง 1 คน"];
  if (males === 2 && genders[0] === genders[1])
    return ["ไม่อนุญาตให้คู่ชายพบคู่หญิง"];
  return [];
}
export function validateRound(
  round: RoundSchedule,
  profiles: PlayerProfile[],
  players: SessionPlayer[],
  expectedCourts?: number,
): string[] {
  const errors = round.matches.flatMap((m) => validateMatch(m, profiles));
  if (expectedCourts !== undefined && round.matches.length !== expectedCourts)
    errors.push("จำนวนสนามไม่ตรงกับการตั้งค่า");
  const courts = round.matches.map((m) => m.court);
  if (
    new Set(courts).size !== courts.length ||
    courts.some((c) => !Number.isInteger(c) || c < 1 || c > 2)
  )
    errors.push("หมายเลขสนามไม่ถูกต้อง");
  const playing = round.matches.flatMap((m) => [
    ...m.teamA.playerIds,
    ...m.teamB.playerIds,
  ]);
  const all = [...playing, ...round.restingPlayerIds];
  if (new Set(all).size !== all.length) errors.push("ผู้เล่นซ้ำในรอบเดียวกัน");
  const eligible = players
    .filter((p) => eligibleInRound(p, round))
    .map((p) => p.playerId);
  if (
    all.some((id) => !eligible.includes(id)) ||
    eligible.some((id) => !all.includes(id))
  )
    errors.push("รายชื่อผู้เล่นที่พร้อมเล่นไม่ครบหรือไม่ถูกต้อง");
  const locks =
    round.fixedPairs?.map(([playerId, fixedPartnerId]) => ({
      playerId,
      fixedPartnerId,
    })) ?? players;
  for (const p of locks)
    if (
      p.fixedPartnerId &&
      playing.includes(p.playerId) &&
      playing.includes(p.fixedPartnerId)
    ) {
      if (
        !round.matches.some((m) =>
          [m.teamA, m.teamB].some(
            (t) =>
              t.playerIds.includes(p.playerId) &&
              t.playerIds.includes(p.fixedPartnerId!),
          ),
        )
      )
        errors.push("คู่ที่ล็อกไว้ต้องอยู่ทีมเดียวกัน");
    }
  return [...new Set(errors)];
}
