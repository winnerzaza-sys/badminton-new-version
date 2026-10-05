# Test Plan

## 1. Unit Tests — Hard Rules
Must cover:
- 4M MM vs MM => valid
- 2M2F MF vs MF => valid
- 2M2F MM vs FF => invalid
- 1M3F MF vs FF => valid
- 3M1F => invalid
- 4F FF vs FF => valid
- duplicate player in round => invalid
- player on both courts => invalid
- fixed pair separated => invalid

## 2. Scoring Tests
- lower game count / participation deficit increases priority appropriately.
- late joiner is not forced to catch up for missed earlier rounds.
- voluntary pause does not create starvation credit.
- partner repeat penalty > opponent repeat penalty.
- consecutive penalty is weaker for 10–11 than 14–15.
- fairness recovery activates when imbalance becomes material.

## 3. Simulation Matrix
For each player count 10–15:
- test multiple feasible gender distributions.
- run at least 100 seeded simulations.
- simulate at least 10 rounds where applicable.

Metrics:
- hardRuleViolations = 0
- gameCountSpread
- participationRateSpread for late join scenarios
- maxRestStreak
- maxPlayStreak
- partnerRepeat distribution
- opponentRepeat distribution
- noValidSchedule rate

Target:
- game count spread <= 1 after 10 rounds when constraints permit.
- if target cannot be met, engine should still choose best valid schedule and surface diagnostic metrics rather than violate a hard rule.

## 4. Dynamic Player Scenarios
- 10 start, player joins after round 3.
- player pauses for 2 rounds and resumes.
- player leaves early.
- active count changes enough that only one court is feasible.
- fixed pair added/removed during active session.

## 5. Manual Editing
- swap two players validly.
- reject swap causing 3M1F.
- reject swap causing MM vs FF.
- replace playing player with resting player.
- undo.
- reset to generated schedule.
- fairness score recalculates.

## 6. Persistence
- create session, reload page, state remains.
- generate schedule, kill/reopen PWA, schedule remains.
- complete session, new session defaults to previous roster but counters are reset.

## 7. Responsive E2E
Playwright viewport tests:
- phone portrait
- iPad portrait
- iPad landscape
- desktop 1440px+

Check no clipped primary actions and schedule remains usable.

## 8. Export
- generated PNG includes every round.
- text is readable at phone viewing size.
- share fallback works when Web Share files unsupported.
