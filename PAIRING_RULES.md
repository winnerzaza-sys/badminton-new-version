# Pairing Rules v2

## Principle
Automatic pairing must satisfy every hard rule. Manual editing explicitly permits 3M1F and MM vs FF (user request, 9 October 2026); all other hard rules still apply. Soft rules are optimization goals and may be traded off when necessary.

## Hard Rules
1. Exactly 4 players per active court.
2. A player cannot appear on two courts in the same round.
3. Fixed pair: if both fixed-pair players are playing in that round, they must be teammates. Manual editing must respect the lock unless explicitly unlocked.
4. 3M1F is forbidden.
5. MM vs FF is forbidden.
6. Valid gender examples:
   - MM vs MM: allowed.
   - MF vs MF: allowed.
   - FF vs FF: allowed.
   - MF vs FF (1M3F): allowed.
   - MM vs FF: forbidden.
   - MM vs MF (3M1F): forbidden.
7. There is NO hard maximum on consecutive games.

## Soft Rules — Priority
1. Game/participation fairness.
2. Avoid starving a player of opportunities / distribute rest fairly.
3. Partner diversity.
4. Opponent diversity.
5. Avoid excessive consecutive games when practical.

## Player Count Behavior
For 2 courts, 8 players play per round.
- 10 players: 2 rest; consecutive play is normal and should be lightly penalized.
- 11: 3 rest.
- 12: 4 rest.
- 13: 5 rest.
- 14: 6 rest.
- 15: 7 rest; long play streaks should be penalized more strongly.

## Late Join / Pause / Leave
Statuses:
- ACTIVE
- NOT_ARRIVED
- PAUSED
- LEFT

Late joiner:
- starts session counters at zero on join,
- must NOT be treated as if they missed earlier rounds,
- fairness should use eligibleRounds / participationRate.

Paused:
- excluded from candidates,
- pause rounds do not increment engine-caused rest.

Left:
- excluded from all future candidates,
- previous history remains intact.

## Session Reset
New session resets:
- totalGames
- restRounds
- consecutiveGames
- partnerHistory
- opponentHistory
- round-level fairness state

Player profile persists.
Historical sessions persist for stats only and do not directly penalize pairings in the new session.
