# แบดมินตัน · Pairing & Schedule

Offline-first badminton pairing PWA with Phases 1–6 implemented. The app has a Thai player directory, previous-roster defaults, full-block generation, four intentional responsive layouts, validated touch/drag editing, undo/reset, live fairness summaries, dynamic availability, multiple blocks, session history, PNG export and native sharing with download fallback.

## Run locally

```sh
npm ci
npm run dev
```

Use the local URL printed by Vite. Production/offline verification:

```sh
npm run build
npm run preview
```

The service worker caches the production app shell after the first online visit. Player profiles, setup drafts and sessions live in IndexedDB. No external fonts, portrait images, pairing APIs or LLMs are required. Clearing browser site data clears local user data.

## Verify

```sh
npm test
npx playwright install chromium webkit
npm run build
npm run test:e2e
```

The simulation matrix runs 100 seeded ten-round schedules for seven gender distributions at each player count from 10 through 15 (4,200 schedules). It writes `reports/simulation-report.json`. Screenshots and actual exported PNGs are written to `test-results/`. Browser tests use the production preview so offline caching is tested rather than assumed. Chromium covers all four sizes; an additional mobile WebKit project checks Safari-engine compatibility. Automated accessibility checks cover setup, player dialogs, schedule, editing, summary and sharing.

## Architecture

- `src/domain/models`: profile, session, availability and schedule types.
- `src/domain/pairing`: deterministic, DOM-free hard-rule validation, scoring and full-block optimization.
- `src/data`: versioned IndexedDB database and repositories.
- `src/features/session/service.ts`: new-session creation, roster defaults and timed schedule-block construction.
- `src/features/session/hydrate.ts`: compatibility for previously saved sessions.
- `src/features/schedule/service.ts`: validated edits, historical availability, lock changes and remaining-round regeneration.
- `src/features/share`: a dedicated fixed-width canvas composition, PNG creation, preview and sharing.
- `src/hooks/useBadminton.ts`: application state, persistence and UI actions.
- `src/App.tsx`, `src/styles/app.css`: responsive presentation.

Generated schedules are plans. Projected game counts do not mark physical games as completed. Existing session counters are not incremented simply by generating a plan.

## Using the session

Choose a round before changing availability or fixed partners: changes apply from that round onward, and earlier rounds remain intact. Pausing and resuming at different round boundaries records the intervening pause without adding engine rest. Late joiners receive opportunities only from their joining round. If two courts become infeasible but one court works, only the remaining rounds switch to one court and a warning is shown. If no court can be formed, the proposed change is rejected without saving it.

Undo records are saved with the schedule and survive refresh. Availability, lock changes and regeneration replace the future generated baseline and clear incompatible undo records. Completed sessions are read-only and remain shareable. Add another time block without confirming the end of every physical game. Projected counters carry the previous blocks' planned opportunities forward.

The exported image uses a 1080px composition independent of viewport size and includes every round in the selected block. Native share opens the device's share sheet; the user chooses LINE. Unsupported sharing downloads the PNG; cancelling a native share does not download it. Settings offers a JSON backup export; backup import is outside this release.

Real iPhone/iPad home-screen installation, process eviction and the actual LINE app still need device testing. Automated WebKit checks do not replace those checks.

See `IMPLEMENTATION_REPORT.md` for the original Phase 1–2 record and `PHASE_3_6_REPORT.md` for the completed workflows and latest validation.
