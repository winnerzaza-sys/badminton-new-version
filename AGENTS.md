# AGENTS.md — Instructions for Codex

## Product
Build a responsive offline-first badminton pairing PWA. Read all specification files before implementation.

## Source of Truth Priority
1. PAIRING_RULES.md — hard/soft pairing rules.
2. ALGORITHM.md — schedule optimization behavior.
3. DATA_MODEL.md — domain/storage model.
4. PRD.md — product scope/workflows.
5. UI_DESIGN.md — responsive UX.
6. PWA_SPEC.md — platform requirements.
7. TEST_PLAN.md — acceptance/testing.

If specifications appear to conflict, do not silently invent a rule. Prefer the higher-priority document and leave a TODO/comment explaining the ambiguity.

## Critical Rules — Never Change Without Explicit Instruction
- 3M1F is forbidden.
- MM vs FF is forbidden.
- 1M3F (MF vs FF) is allowed.
- MM vs MM, MF vs MF, FF vs FF are allowed.
- There is no hard maximum consecutive-game rule.
- Qwen/LLM is NOT part of MVP.
- Pairing should generate a full schedule block (default 1 hour), not require users to finish every physical round in the app.
- Manual editing is allowed but must still satisfy hard rules.

## Architecture
Keep these layers separate:
- domain/ pairing engine: pure TypeScript, no React/IndexedDB dependencies.
- storage repositories.
- application/session state.
- React UI.
- export/share service.

Pairing engine must be testable in Node/Vitest without DOM.

## Suggested Project Structure
```text
src/
  domain/
    pairing/
    models/
  data/
    indexeddb/
    repositories/
  features/
    home/
    session/
    schedule/
    players/
    history/
    share/
  components/
  hooks/
  utils/
  styles/
tests/
  unit/
  simulation/
  e2e/
```

## Implementation Phases
### Phase 1 — Foundation
- Vite + React + TypeScript.
- Responsive app shell.
- PWA manifest/service worker.
- IndexedDB repositories.
- Player CRUD.
- Session creation with previous-roster defaults.

### Phase 2 — Pairing Engine
- Domain models.
- Hard-rule validator.
- Scoring functions.
- Seeded candidate/schedule generation.
- Full-block optimization.
- Unit + simulation tests for 10–15 players.

Do not proceed if hard-rule tests fail.

### Phase 3 — Schedule UX
- Generate 1-hour schedule.
- Mobile cards.
- iPad portrait layout.
- iPad landscape layout.
- Desktop layout.
- Summary/fairness metrics.

### Phase 4 — Manual Adjustment
- tap-to-swap.
- drag/drop where appropriate.
- resting-player replacement.
- fixed-pair handling.
- undo/reset.
- score recalculation.

### Phase 5 — Dynamic Players / History
- late join.
- pause/resume.
- leave early.
- participation-rate fairness.
- completed session history.
- resume unfinished session.

### Phase 6 — Export / Polish
- dedicated share preview.
- PNG generation.
- Web Share + fallback.
- offline QA.
- responsive E2E.
- accessibility polish.

## Quality Rules
- Prefer simple, readable TypeScript over clever abstractions.
- No hard-coded player names.
- Do not use an LLM/API for pairing.
- All randomness in engine tests must be seedable.
- Avoid mutating input domain objects inside scoring functions.
- Display user-friendly Thai errors for invalid manual edits.
- Preserve data across refresh/restart.

## Mandatory UI reference workflow
- Before implementing any UI screen, inspect `references/ui-responsive-reference.png`.
- Treat that image as the visual source of truth and `UI_DESIGN.md` as the behavioral/responsive source of truth.
- Do not implement only desktop-first CSS and rely on shrinking/reflowing it for mobile/tablet.
- Explicitly test four targets: mobile, iPad portrait, iPad landscape, desktop.
- Preserve the visual hierarchy and Court 1/Court 2/Rest color semantics from the reference.
- If an exact visual detail conflicts with accessibility, data density, or a functional requirement, preserve the functional requirement and document the small visual deviation.
