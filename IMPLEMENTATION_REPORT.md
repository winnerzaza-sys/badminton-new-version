# Phase 1–2 implementation report

## Delivered

Vite + React + TypeScript, installable PWA manifest/icons and an offline app-shell service worker; versioned IndexedDB repositories; Thai add/edit/deactivate/reactivate player flows; persisted roster/config drafts; previous-session roster selection; new-session counters reset; stored full-block generation; and an offer to reopen the latest unfinished session.

The responsive foundation includes a read-only generated schedule preview to verify the integrated flow. Manual adjustment, completion/history controls and PNG/share are later phases and are not exposed as placeholder buttons.

## Pairing approach

The engine enumerates eligible player subsets and legal team/court layouts, rejecting prohibited gender combinations and separated fixed pairs. It caches valid round membership options for a bounded number of roster configurations. A seeded quota search with backtracking seeks floor/ceiling final game counts for the entire block. It excludes structurally unplayable players from those achievable quotas, while retaining them in rest/fairness diagnostics and warnings.

Seeded heuristic full-block candidates handle staggered availability and quota-search exhaustion. Local search proposes two-round membership exchanges and team rearrangements, validates each affected schedule, and scores the whole block. Participation-rate spread is the first comparison criterion, followed by weighted full-block score. This follows the higher-priority fairness rule even when the suggested 0–100 balance component saturates at zero. Search limits are iteration/node budgets, not a proof of globally optimal diversity or a guaranteed wall-clock time.

Scoring returns balance, rest, partner/opponent diversity and consecutive-play components, projected player counters, participation-rate spread, rest/play streak maxima, repeat counts/distributions, recovery state and Thai warnings. Inputs are copied before history projection. No React, storage, network or LLM dependency exists in the pairing engine. Paused/not-arrived/left players receive no rest opportunity credit; a voluntary absence breaks streaks. Join/leave round boundaries are supported in the domain; interactive status management remains Phase 5.

`ScheduleBlock` has two optional diagnostic extensions: `warnings` and `generationSeed`. Existing records remain readable without either field.

## Validation

- Production TypeScript/build and generated service worker succeeded.
- 18 focused unit/repository tests passed, covering hard rules, seeded determinism, locks, non-mutation, scoring, availability, pause/resume, late join and storage across database connections.
- 4,200 seeded ten-round simulations passed, with zero hard-rule violations and zero failed schedule generations in the tested matrix.
- Each player count used 100 seeds for each male count: 0, 1, 2, floor(N/2), N−2, N−1, N.
- Six Chromium browser tests passed: generation/resume and layout at mobile 390×844, iPad portrait 820×1180, iPad landscape 1180×820 and desktop 1440×1000; plus player CRUD and production offline reload/generation on desktop. Six duplicate CRUD/offline project cases were intentionally skipped. These are viewport/browser tests, not a claim that real Safari/iPad installation was tested.
- Dependency audit: zero reported vulnerabilities.

| Players | Simulations | Hard-rule violations | Largest spread, feasible tested rosters | Spread with one woman and remaining men |
| ------- | ----------- | -------------------- | --------------------------------------- | --------------------------------------- |
| 10      | 700         | 0                    | 0                                       | 9                                       |
| 11      | 700         | 0                    | 1                                       | 8                                       |
| 12      | 700         | 0                    | 1                                       | 8                                       |
| 13      | 700         | 0                    | 1                                       | 7                                       |
| 14      | 700         | 0                    | 1                                       | 7                                       |
| 15      | 700         | 0                    | 1                                       | 6                                       |

One woman cannot appear on a court with three men under the mandatory 3M1F ban. Consequently her game count is zero; an overall spread ≤1 is impossible in those tested rosters. The engine still distributes the 80 available game slots evenly among players who can play and persists warnings identifying the excluded player. Other gender distributions, arbitrary locks and seeds outside this matrix are not an exhaustive feasibility proof.

The machine-readable report includes maximum rest/play streaks, participation-rate spread, partner/opponent repeat counts and distributions by roster. Soft streaks are diagnostics and never impose a hard consecutive-game limit.

## Visual reference decisions

The approved reference was inspected before UI work. Court 1 retains green, Court 2 pink and Rest blue. Mobile uses stacked court cards and round lists; portrait tablet uses two court columns and full-width rest; landscape uses navigation + selected round/full schedule + player statistics; desktop prioritizes the full schedule table.

Small intentional deviations: neutral initials replace portrait artwork so the app stays offline and does not depend on generated portraits. Mobile stacks courts vertically to satisfy the written touch/readability requirement. Only implemented navigation/actions are shown during Phase 1–2. Text is Thai-first and all routine controls remain at least approximately 44px touch targets; round table links have a larger clickable control than their visual number chip.

## Files created

- Project/tooling: `package.json`, `package-lock.json`, `.gitignore`, `index.html`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`.
- PWA assets: `public/icon-192.png`, `public/icon-512.png`.
- Domain: `src/domain/models/index.ts`, `src/domain/pairing/validator.ts`, `src/domain/pairing/scoring.ts`, `src/domain/pairing/engine.ts`.
- Persistence: `src/data/indexeddb/database.ts`, `src/data/repositories/index.ts`.
- Application: `src/features/session/service.ts`, `src/hooks/useBadminton.ts`.
- UI: `src/main.tsx`, `src/App.tsx`, `src/styles/app.css`.
- Tests: `tests/fixtures.ts`, `tests/unit/rules.test.ts`, `tests/unit/engine.test.ts`, `tests/unit/storage.test.ts`, `tests/simulation/matrix.test.ts`, `tests/e2e/foundation.spec.ts`.
- Documentation/report: `README.md`, `IMPLEMENTATION_REPORT.md`, `reports/simulation-report.json`.

The specification files and reference image were preserved.

## Phase 3 next steps

Build fuller schedule review around this tested engine: regenerate with a new seed, expose all fairness components and explanations, improve round navigation and roster context across the four layouts, and run additional accessibility checks with long Thai names and larger rosters. Move generation into a worker if device profiling shows main-thread pauses. Keep manual editing/share/history implementation aligned with Phases 4–6.
