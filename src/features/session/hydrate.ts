import type { Session, PlayerProfile } from "../../domain/models";
import { scoreSchedule } from "../../domain/pairing/scoring";
// Add optional historical snapshots to Phase 1–2 records without erasing data.
export function hydrateSession(
  source: Session,
  profiles: PlayerProfile[],
): Session {
  const session = structuredClone(source);
  session.playerProfiles ??= Object.fromEntries(
    profiles
      .filter((p) => session.playerIds.includes(p.id))
      .map((p) => [p.id, structuredClone(p)]),
  );
  let baseline = structuredClone(Object.values(session.sessionPlayers));
  for (const block of session.blocks) {
    block.baselinePlayers ??= structuredClone(baseline);
    block.undoHistory ??= [];
    for (const rounds of [block.rounds, block.originalGeneratedRounds])
      for (const round of rounds) {
        round.eligiblePlayerIds ??= [
          ...new Set([
            ...round.matches.flatMap((m) => [
              ...m.teamA.playerIds,
              ...m.teamB.playerIds,
            ]),
            ...round.restingPlayerIds,
          ]),
        ];
        round.fixedPairs ??= block.baselinePlayers
          .filter((p) => p.fixedPartnerId)
          .map((p) => [p.playerId, p.fixedPartnerId!] as [string, string]);
      }
    baseline = scoreSchedule(
      block.rounds,
      block.baselinePlayers,
    ).projectedPlayers;
  }
  return session;
}
