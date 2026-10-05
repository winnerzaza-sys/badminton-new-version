# Phase 3–6 delivery

## Implemented workflows

**Phase 3 — Schedule review.** Complete-block schedule review, round selection, configurable play blocks, regeneration from a chosen round, all five score components, game counts, eligible opportunities, participation-rate spread, rest/play streak maxima and repeat metrics. Mobile shows cards and a round list; portrait tablet uses two courts with full-width rest; landscape keeps navigation, court workspace/table and player context together; desktop prioritizes the table. No round-completion workflow is required.

**Phase 4 — Manual adjustment.** Tap two player tokens to swap, including replacing a playing player with someone resting. Tablet/desktop also support drag/drop with touch selection as fallback. The pure adjustment service validates the resulting schedule before applying or saving it. Invalid gender combinations and separated locks show Thai errors without changing the plan. Accepted edits recalculate scores, show a score delta, and ask for confirmation when the visible soft score decreases. Per-round and full-block reset plus a persisted 20-entry undo stack are available.

**Phase 5 — Availability and history.** Add existing/new profiles as late joiners, mark not arrived/paused/active/left at the selected round boundary, lock/unlock pairs explicitly, add subsequent time blocks, archive completed sessions and reopen unfinished sessions. Prefix rounds retain their original eligibility/lock snapshots. A two-round voluntary pause excludes those opportunities and breaks streaks. Joining players start at zero counters and are compared by participation rate. Archived sessions preserve names/genders using profile snapshots, remain read-only, and can be exported. New-session creation resets counters and preselects the latest session roster.

Changes to availability and locks regenerate the remaining rounds and later blocks. If only one court remains feasible, the tail uses one court and explains why. If fewer than four compatible players remain, the whole proposed change fails and is not persisted. Regeneration replaces the relevant generated tail and clears undo snapshots that would otherwise reintroduce outdated availability. Earlier generated rounds are preserved for reset.

**Phase 6 — Export and polish.** Dedicated share preview; a fixed 1080px canvas composition with every round in the selected block; wrapped Thai names without splitting combining marks on supported browsers; deterministic pixels within the same browser/font environment regardless of viewport; saved PNG; native file sharing with download fallback and correct cancellation behavior. Sharing does not post directly to LINE. Offline caches include the app code; fonts, canvas rendering and pairing require no server. Settings includes installation instructions, storage persistence where supported, a JSON backup export and an explicit service-worker update action. Text contrast was strengthened while retaining green/pink/blue court/rest semantics.

## Data compatibility and architecture

The pure pairing engine stays independent of React and IndexedDB. New round metadata captures eligible IDs and fixed pairs; blocks store their scoring baseline and undo history; sessions store profile snapshots. All fields are optional for previously saved Phase 1–2 records. `hydrateSession` upgrades those records in memory and preserves existing plans; later writes persist the enriched records. IndexedDB version 2 removes the unused boolean player index without deleting players, settings or sessions.

Projected counters represent planned game slots, not verified match results. When adding a subsequent block, prior planned opportunities carry forward. Completing a session archives the plan; it does not infer scores or physical game outcomes.

## Validation

- Production TypeScript/build and generated offline service worker passed.
- 26 unit/repository tests passed. The simulation matrix is an additional test; it passed in the full run before the final archive-counter regression test was added, and the affected unit tests were rerun afterward.
- The full 4,200-seed, ten-round matrix passed again: zero hard-rule violations and feasible tested distributions maintain spread ≤1. The one-woman/all-other-men constraint remains explicitly diagnosed.
- Browser coverage includes the four Chromium viewports, plus mobile WebKit. Tests cover valid/invalid manual editing, persisted undo, pause/resume, late join, summary, viewport-independent PNG bytes, real PNG downloads, completion/history/new-roster defaults, drag/drop, lock/unlock, added blocks, share/cancel/fallback behavior and offline production reload/generation.
- Automated accessibility checks cover setup, the player dialog, schedule, manual adjustment, summary and share preview. These are automated WCAG checks, not a comprehensive human accessibility certification.

The final browser suite passed 20 tests with 20 intentionally skipped duplicate/platform-specific cases. Five accessibility tests cover all four Chromium targets plus mobile WebKit. The complete application flow runs offline on all four Chromium targets; WebKit runs the same application flow online and separately verifies cached launch, generation, PNG download and saved-session reload with its local origin server stopped. Playwright's `setOffline(true)` currently fails WebKit service-worker navigation before cache fulfilment, matching [upstream issue #42775](https://github.com/microsoft/playwright/issues/42775), so that emulation path is not treated as application evidence. Actual origin shutdown provides the offline check instead.

## Principal files added or changed

- Models, rule validation/scoring, session generation and IndexedDB migration.
- `src/features/schedule/service.ts`, `ScheduleWorkspace.tsx`.
- `src/features/session/hydrate.ts`.
- `src/features/history/History.tsx`, `src/features/home/Settings.tsx`.
- `src/features/share/service.ts`, `SharePreview.tsx`.
- `src/hooks/useBadminton.ts`, `src/App.tsx`, responsive/accessibility CSS and Thai time/date formatting.
- Adjustment unit tests; shared browser fixtures; full-workflow, sharing and accessibility browser tests; Chromium/WebKit project configuration.

## Remaining device verification

## Post-release Ant Design migration

Ant Design 6.6.5 now supplies all dropdowns, play setup Form/DatePicker/TimePicker/
InputNumber, the player Modal/Form, asynchronous confirmation dialogs, Alert
feedback and a player-save message. Larger dropdown lists allow searching. Native
CSS is scoped to avoid affecting library inputs and calendar tables. Tablet setup
keeps two columns at 768–1199px; phone calendar/time popups are positioned within
the viewport. Date/time values remain local YYYY-MM-DD and HH:mm storage strings.
Court presentation, pairing rules, canvas rendering and IndexedDB schema are unchanged.

Final migration validation: production build passed; 29 unit tests passed; the full
browser suite passed 35 tests with 20 intentional platform-specific skips. Coverage
includes dropdown popup bounds, date/time draft persistence, whitespace validation,
confirm/cancel persistence, five automated accessibility cases, complete editing/
sharing flows, Chromium offline reload and WebKit origin-shutdown offline launch.
The offline precache is approximately 1.8 MiB including local font assets; the main
JavaScript is approximately 330 kB gzipped. The domain simulation matrix was not
rerun for this UI-only migration.

### Device checks

Real iPhone/iPad home-screen installation, Safari process eviction/relaunch and choosing LINE in a physical device's native share sheet were not tested here. WebKit automation exercises the browser engine and offline workflows but does not reproduce iOS storage quotas, installation UI or the LINE app. Backup import, cloud sync and physical match scores remain outside MVP scope.
