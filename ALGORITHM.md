# Pairing Engine v2 — Algorithm

## 1. Strategy
Generate and optimize the entire schedule block (e.g. 6 rounds / 1 hour) instead of choosing only the next round.

Pipeline:
1. Read active eligible players.
2. Generate valid round candidates.
3. Reject hard-rule violations.
4. Build schedule candidates across N rounds.
5. Score the full schedule.
6. Search/iterate for a better schedule within a bounded time/iteration budget.
7. Return best schedule plus score breakdown.

Implementation may start with randomized/heuristic search and improve later. Keep engine pure and deterministic when supplied a seed.

## 2. Score Components (0–100)
- GameBalance
- RestFairness
- PartnerDiversity
- OpponentDiversity
- ConsecutiveScore

Suggested dynamic weights:

### 10–11 active players
- GameBalance 40
- RestFairness 25
- PartnerDiversity 20
- OpponentDiversity 10
- Consecutive 5

### 12–13
- GameBalance 35
- RestFairness 25
- PartnerDiversity 20
- OpponentDiversity 10
- Consecutive 10

### 14–15
- GameBalance 30
- RestFairness 30
- PartnerDiversity 20
- OpponentDiversity 10
- Consecutive 10

Weights should use active eligible count for the relevant round/block, not original session size.

## 3. Game Balance
For players available from block start, prefer final game-count spread <= 1.
For late joiners, use participation rate:

participationRate = totalGames / eligibleRounds

Do not force a late joiner to catch up to players who were present earlier.

Projected spread score guideline:
- spread 0 => 100
- spread 1 => 90
- spread 2 => 55
- spread 3 => 20
- >3 => 0

If fairness deteriorates (e.g. effective spread >= 2), enable Fairness Recovery and temporarily emphasize balance/rest over diversity.

Suggested recovery weights:
- GameBalance 55
- RestFairness 25
- PartnerDiversity 10
- OpponentDiversity 5
- Consecutive 5

## 4. Rest Fairness
Prefer players who have waited longer, but distinguish engine rest from voluntary pause.

Suggested starvation penalties if an ACTIVE eligible player is rested again:
- prior rest streak 0 => 0
- 1 => 5
- 2 => 15
- >=3 => 35+

Never make starvation a hard rule because gender/fixed-pair constraints may require exceptions.

## 5. Consecutive Penalty
No hard cap.

Suggested penalty by active count:

10–11:
- streak <=1: 0
- 2: 2
- 3: 5
- 4: 10
- 5+: 15

12–13:
- <=1: 0
- 2: 5
- 3: 12
- 4+: 20

14–15:
- <=1: 0
- 2: 10
- 3: 25
- 4+: 40

Normalize into a 0–100 component score.

## 6. Partner Diversity
Suggested pair penalty based on previous occurrences in current session/block:
- 0 => 0
- 1 => 10
- 2 => 25
- 3 => 45
- >=4 => 60

Partner repeat matters more than opponent repeat.

## 7. Opponent Diversity
Suggested penalty:
- 0 => 0
- 1 => 3
- 2 => 8
- 3 => 15
- >=4 => 20

## 8. Full Schedule Optimization
Do not only maximize each round independently. Score the completed schedule so that a locally good round cannot create a bad final distribution.

Recommended MVP approach:
- Generate many valid schedules using seeded randomized construction.
- At each round, bias player selection toward fairness but keep diversity among candidates.
- Apply local search: swaps between rounds, player replacements, team rearrangements.
- Keep changes only when hard rules pass and total score improves.
- Use a bounded iteration count/time budget suitable for mobile Safari.

Return:
- totalScore 0–100
- component scores
- per-player projected game counts
- warnings, if any

## 9. Manual Editing
Manual swap/replace flow:
1. Create proposed edit.
2. Validate affected round hard rules.
3. If invalid, reject and explain rule.
4. If valid, apply edit.
5. Recalculate schedule score and projected stats.
6. Add edit to undo stack.

Manual changes may reduce soft fairness. Show the effect but allow confirmation.

## 10. One Court
If configured/available courts = 1, select 4 players per round and apply the same rules/scoring.

## 11. Determinism
All simulation and debugging APIs should accept a seed so failures are reproducible.
