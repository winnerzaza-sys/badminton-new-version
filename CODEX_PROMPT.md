# Codex Implementation Prompt

Implement the application described by the specification files in this folder.

First read, in order:
1. AGENTS.md
2. PAIRING_RULES.md
3. ALGORITHM.md
4. DATA_MODEL.md
5. PRD.md
6. UI_DESIGN.md
7. PWA_SPEC.md
8. TEST_PLAN.md

Then implement Phase 1 and Phase 2 first. Do not start by building a large UI before the pairing domain tests exist.

Important product behavior:
- Responsive PWA for mobile, iPad portrait, iPad landscape and desktop.
- Primary use case: select today's players, generate the entire ~1 hour schedule in advance, optionally manually adjust pairings, then export/share a clean image to LINE.
- Session defaults to the previous session's selected roster but the user can add/remove players.
- New sessions reset pairing/game/rest histories while retaining player profiles and archived sessions.
- Support late join, pause and leave-early architecture.

Critical pairing rules:
- 3M1F: forbidden.
- MM vs FF: forbidden.
- 1M3F / MF vs FF: allowed.
- MM vs MM: allowed.
- MF vs MF: allowed.
- FF vs FF: allowed.
- No hard maximum consecutive games.
- Fixed pairs must remain together when both are scheduled unless unlocked.

The pairing engine must be pure TypeScript and independently testable. Generate and optimize a complete schedule block rather than greedily generating only the next round. Use seeded randomness for reproducible tests.

Before considering Phase 2 complete, run simulation tests for player counts 10, 11, 12, 13, 14 and 15 across multiple gender distributions. Hard-rule violations must be zero. Target final game-count spread <= 1 after 10 rounds whenever constraints permit.

After Phase 1–2, report:
- files created/changed,
- pairing algorithm approach,
- test results by player count,
- any roster/gender combinations where <=1 spread could not be achieved,
- next steps for Phase 3.

## Visual implementation requirement
Before writing UI code, open and inspect `references/ui-responsive-reference.png`, then read the responsive section in `UI_DESIGN.md`. Implement four intentional layouts: mobile, iPad portrait, iPad landscape, and desktop. Do not treat the reference as decorative inspiration only; use it as the visual source of truth for hierarchy, information density, court/rest cards, navigation, schedule presentation, and share preview.
