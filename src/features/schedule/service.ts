import {
  freshSessionPlayer,
  type Session,
  type SessionPlayer,
  type SessionPlayerStatus,
  type PlayerProfile,
  type ScheduleBlock,
  type RoundSchedule,
} from "../../domain/models";
import { scoreSchedule } from "../../domain/pairing/scoring";
import { generateSchedule } from "../../domain/pairing/engine";
import { validateRound } from "../../domain/pairing/validator";
export function sessionProfiles(session: Session, profiles: PlayerProfile[]) {
  return session.playerIds
    .map(
      (id) =>
        session.playerProfiles?.[id] ?? profiles.find((p) => p.id === id)!,
    )
    .filter(Boolean);
}
export function blockBaseline(session: Session, block: ScheduleBlock) {
  return structuredClone(
    block.baselinePlayers ?? Object.values(session.sessionPlayers),
  );
}
export function projectBlock(session: Session, block: ScheduleBlock) {
  return scoreSchedule(block.rounds, blockBaseline(session, block));
}
export function archiveSession(
  source: Session,
  completedAt = new Date().toISOString(),
): Session {
  const session = structuredClone(source),
    last = session.blocks.at(-1);
  if (last)
    session.sessionPlayers = Object.fromEntries(
      projectBlock(session, last).projectedPlayers.map((p) => [
        p.playerId,
        {
          ...p,
          status: session.sessionPlayers[p.playerId].status,
          joinedAtRound: session.sessionPlayers[p.playerId].joinedAtRound,
          leftAtRound: session.sessionPlayers[p.playerId].leftAtRound,
          fixedPartnerId: session.sessionPlayers[p.playerId].fixedPartnerId,
        },
      ]),
    );
  session.status = "COMPLETED";
  session.completedAt = completedAt;
  session.updatedAt = completedAt;
  return session;
}
function rescore(session: Session, block: ScheduleBlock) {
  const result = projectBlock(session, block);
  block.score = result.score;
  block.warnings = (block.warnings ?? []).filter(
    (w) => !w.startsWith("จำนวนเกมต่างกัน"),
  );
  if (
    result.metrics.gameCountSpread > 1 &&
    result.metrics.participationRateSpread > 0.15
  )
    block.warnings.push(
      "จำนวนเกมต่างกันมากกว่า 1 เกม ตรวจดูโอกาสลงเล่นของผู้ที่เข้าช้าหรือพักด้วย",
    );
  block.updatedAt = new Date().toISOString();
  return block;
}
export function validateBlock(
  session: Session,
  block: ScheduleBlock,
  profiles: PlayerProfile[],
) {
  const errors = block.rounds.flatMap((r) =>
    validateRound(
      r,
      sessionProfiles(session, profiles),
      blockBaseline(session, block),
      undefined,
      { allowAnyGenderCombination: r.manualGenderOverride === true },
    ),
  );
  if (errors.length) throw new Error([...new Set(errors)].join(" · "));
}
export function swapPlayers(
  session: Session,
  source: ScheduleBlock,
  profiles: PlayerProfile[],
  roundIndex: number,
  a: string,
  b: string,
) {
  if (session.status === "COMPLETED")
    throw new Error("เซสชันนี้จบแล้ว เปิดดูได้อย่างเดียว");
  const block = structuredClone(source),
    round = block.rounds[roundIndex];
  if (!round || a === b) throw new Error("เลือกผู้เล่นสองคนที่ต่างกัน");
  const playing = round.matches.flatMap((m) => [
    ...m.teamA.playerIds,
    ...m.teamB.playerIds,
  ]);
  const all = [...playing, ...round.restingPlayerIds];
  if (!all.includes(a) || !all.includes(b))
    throw new Error("ผู้เล่นไม่อยู่ในรอบที่เลือก");
  if (!playing.includes(a) && !playing.includes(b))
    throw new Error("เลือกผู้เล่นในสนามอย่างน้อยหนึ่งคน");
  const exchange = (id: string) => (id === a ? b : id === b ? a : id);
  for (const match of round.matches)
    for (const team of [match.teamA, match.teamB])
      team.playerIds = team.playerIds.map(exchange) as [string, string];
  round.restingPlayerIds = round.restingPlayerIds.map(exchange);
  round.manualGenderOverride = true;
  validateBlock(session, block, profiles);
  block.undoHistory = [
    ...(source.undoHistory ?? []),
    {
      rounds: structuredClone(source.rounds),
      score: source.score,
      warnings: source.warnings,
    },
  ].slice(-20);
  block.manuallyModified = true;
  return rescore(session, block);
}
export function undoEdit(
  session: Session,
  source: ScheduleBlock,
  profiles: PlayerProfile[],
) {
  const block = structuredClone(source),
    previous = block.undoHistory?.pop();
  if (!previous) return block;
  block.rounds = previous.rounds;
  block.score = previous.score;
  block.warnings = previous.warnings;
  block.manuallyModified =
    JSON.stringify(block.rounds) !==
    JSON.stringify(block.originalGeneratedRounds);
  validateBlock(session, block, profiles);
  return rescore(session, block);
}
export function resetGenerated(
  session: Session,
  source: ScheduleBlock,
  profiles: PlayerProfile[],
  roundIndex?: number,
) {
  const block = structuredClone(source);
  block.undoHistory = [
    ...(source.undoHistory ?? []),
    {
      rounds: structuredClone(source.rounds),
      score: source.score,
      warnings: source.warnings,
    },
  ].slice(-20);
  if (roundIndex === undefined)
    block.rounds = structuredClone(block.originalGeneratedRounds);
  else
    block.rounds[roundIndex] = structuredClone(
      block.originalGeneratedRounds[roundIndex],
    );
  validateBlock(session, block, profiles);
  block.manuallyModified =
    JSON.stringify(block.rounds) !==
    JSON.stringify(block.originalGeneratedRounds);
  return rescore(session, block);
}
export function regenerateRemaining(
  session: Session,
  source: ScheduleBlock,
  profiles: PlayerProfile[],
  fromIndex: number,
  seed: number,
) {
  if (fromIndex < 0 || fromIndex >= source.rounds.length)
    throw new Error("ไม่พบรอบที่เลือก");
  const block = structuredClone(source),
    baseline = blockBaseline(session, block);
  // Freeze earlier opportunities; use current statuses and locks only for the tail.
  const projected = scoreSchedule(
    block.rounds.slice(0, fromIndex),
    baseline,
  ).projectedPlayers;
  const players = projected.map((p) => ({
    ...p,
    status: session.sessionPlayers[p.playerId].status,
    joinedAtRound: session.sessionPlayers[p.playerId].joinedAtRound,
    leftAtRound: session.sessionPlayers[p.playerId].leftAtRound,
    fixedPartnerId: session.sessionPlayers[p.playerId].fixedPartnerId,
  }));
  const startRound = block.rounds[fromIndex].roundNumber;
  let courts = block.courtCount,
    result: ReturnType<typeof generateSchedule>;
  try {
    result = generateSchedule({
      profiles: sessionProfiles(session, profiles),
      players,
      courtCount: courts,
      roundCount: block.rounds.length - fromIndex,
      startRound,
      seed,
    });
  } catch (error) {
    if (courts !== 2) throw error;
    courts = 1;
    result = generateSchedule({
      profiles: sessionProfiles(session, profiles),
      players,
      courtCount: courts,
      roundCount: block.rounds.length - fromIndex,
      startRound,
      seed,
    });
  }
  const tail = result.rounds.map((r, i) => ({
    ...r,
    estimatedStart: block.rounds[fromIndex + i].estimatedStart,
    estimatedEnd: block.rounds[fromIndex + i].estimatedEnd,
    eligiblePlayerIds: players
      .filter(
        (p) =>
          p.status === "ACTIVE" &&
          p.joinedAtRound <= r.roundNumber &&
          (p.leftAtRound === undefined || r.roundNumber < p.leftAtRound),
      )
      .map((p) => p.playerId),
    fixedPairs: players
      .filter((p) => p.fixedPartnerId)
      .map((p) => [p.playerId, p.fixedPartnerId!] as [string, string]),
  }));
  block.rounds = [...block.rounds.slice(0, fromIndex), ...tail];
  block.originalGeneratedRounds = [
    ...block.originalGeneratedRounds.slice(0, fromIndex),
    ...structuredClone(tail),
  ];
  block.undoHistory = [];
  block.generationSeed = seed;
  block.warnings = [
    ...result.warnings,
    ...(courts !== block.courtCount
      ? ["รอบที่เหลือใช้ 1 สนาม เพราะจำนวนหรือสัดส่วนผู้เล่นไม่พอสำหรับ 2 สนาม"]
      : []),
  ];
  block.manuallyModified =
    JSON.stringify(block.rounds) !==
    JSON.stringify(block.originalGeneratedRounds);
  validateBlock(session, block, profiles);
  return rescore(session, block);
}
export function changeAvailability(
  source: Session,
  profiles: PlayerProfile[],
  blockIndex: number,
  roundIndex: number,
  id: string,
  status: SessionPlayerStatus,
  seed: number,
) {
  const session = structuredClone(source),
    block = session.blocks[blockIndex],
    round = block.rounds[roundIndex].roundNumber;
  const player = session.sessionPlayers[id];
  if (!player) throw new Error("ไม่พบผู้เล่น");
  if (player.status === "LEFT" && status !== "LEFT")
    throw new Error("ผู้เล่นที่ออกแล้วไม่สามารถกลับเข้าเซสชันนี้ได้");
  const wasNotArrived = player.status === "NOT_ARRIVED";
  player.status = status;
  if (wasNotArrived && status === "ACTIVE") player.joinedAtRound = round;
  if (status === "LEFT") player.leftAtRound = round;
  if (status !== "ACTIVE") {
    player.currentRestStreak = 0;
    player.consecutiveGames = 0;
  }
  session.blocks[blockIndex] = regenerateRemaining(
    session,
    block,
    profiles,
    roundIndex,
    seed,
  );
  return refreshFollowing(session, profiles, blockIndex, seed);
}
export function addLatePlayer(
  source: Session,
  profiles: PlayerProfile[],
  blockIndex: number,
  roundIndex: number,
  id: string,
  seed: number,
) {
  if (source.playerIds.includes(id))
    throw new Error("ผู้เล่นคนนี้อยู่ในเซสชันแล้ว");
  const profile = profiles.find((p) => p.id === id && p.active);
  if (!profile) throw new Error("ไม่พบผู้เล่นที่ใช้งาน");
  const session = structuredClone(source),
    block = session.blocks[blockIndex],
    state = freshSessionPlayer(id);
  state.joinedAtRound = block.rounds[roundIndex].roundNumber;
  session.playerIds.push(id);
  session.sessionPlayers[id] = state;
  session.playerProfiles = {
    ...session.playerProfiles,
    [id]: structuredClone(profile),
  };
  block.baselinePlayers = [
    ...blockBaseline(source, source.blocks[blockIndex]),
    structuredClone(state),
  ];
  session.blocks[blockIndex] = regenerateRemaining(
    session,
    block,
    profiles,
    roundIndex,
    seed,
  );
  return refreshFollowing(session, profiles, blockIndex, seed);
}
export function setFixedPair(
  source: Session,
  profiles: PlayerProfile[],
  blockIndex: number,
  roundIndex: number,
  id: string,
  partner: string | undefined,
  seed: number,
) {
  if (partner === id) throw new Error("ไม่สามารถล็อกคู่กับตัวเอง");
  const session = structuredClone(source),
    player = session.sessionPlayers[id];
  if (!player) throw new Error("ไม่พบผู้เล่น");
  const clear = (person: string) => {
    const old = session.sessionPlayers[person].fixedPartnerId;
    delete session.sessionPlayers[person].fixedPartnerId;
    if (old && session.sessionPlayers[old]?.fixedPartnerId === person)
      delete session.sessionPlayers[old].fixedPartnerId;
  };
  clear(id);
  if (partner) {
    if (!session.sessionPlayers[partner]) throw new Error("ไม่พบคู่เล่น");
    clear(partner);
    player.fixedPartnerId = partner;
    session.sessionPlayers[partner].fixedPartnerId = id;
  }
  session.blocks[blockIndex] = regenerateRemaining(
    session,
    session.blocks[blockIndex],
    profiles,
    roundIndex,
    seed,
  );
  return refreshFollowing(session, profiles, blockIndex, seed);
}
function refreshFollowing(
  session: Session,
  profiles: PlayerProfile[],
  fromBlock: number,
  seed: number,
) {
  for (let i = fromBlock + 1; i < session.blocks.length; i++) {
    session.blocks[i].baselinePlayers = projectBlock(
      session,
      session.blocks[i - 1],
    ).projectedPlayers;
    session.blocks[i] = regenerateRemaining(
      session,
      session.blocks[i],
      profiles,
      0,
      seed + i,
    );
  }
  return session;
}
