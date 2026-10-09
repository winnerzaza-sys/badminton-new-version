# Badminton Pairing PWA — PRD

## 1. Product Goal
Responsive PWA for organizing badminton pairings and generating a full play schedule in advance, optimized for mobile, iPad portrait/landscape, and desktop.

Primary workflow:
1. Open PWA.
2. Create a new session, defaulting to players selected in the previous session.
3. Add/remove players for today.
4. Configure duration, courts, points/game, and planned rounds.
5. Generate the whole schedule for a block (default 1 hour).
6. Review and manually swap/replace players if needed.
7. Export a clean image and share to LINE.
8. Finish and archive the session.

No LLM/Qwen is required in MVP.

## 2. Target Devices
- Mobile: responsive card-first layout.
- iPad portrait: primary touch-friendly tablet layout.
- iPad landscape: primary courtside control layout.
- Desktop: dense schedule + statistics layout.

Suggested breakpoints:
- Mobile: < 768px
- Tablet: 768–1199px
- Desktop: >= 1200px

## 3. Core Features
### Player Directory
- Persistent player profiles: name, gender, active status.
- Gender values: M / F.
- Add/edit/deactivate players.

### Sessions
- Create a new session.
- Preselect the same players used in the most recent session.
- User may add/remove selected players before generation.
- Session-level statistics reset for every new session.
- Keep completed sessions as history.
- Resume an unfinished session after browser/PWA restart.

### Schedule Block
- Default duration: 1 hour.
- Configurable: 1 / 1.5 / 2 hours or custom later.
- Configurable courts: 1–2 in MVP.
- Configurable rounds; default suggestion based on duration, e.g. 6 rounds/hour.
- Generate all rounds at once rather than requiring round-by-round completion.

### Pairing Engine
- Generate valid schedules respecting hard rules.
- Optimize fairness over the entire block, not greedily per round.
- Support baseline rosters of 10–15 players, while active player count may change during a session.
- See PAIRING_RULES.md and ALGORITHM.md.

### Manual Editing
- Swap two playing players.
- Replace a playing player with a resting player.
- Touch-friendly tap-to-swap on mobile.
- Drag & drop may be used on tablet/desktop.
- Validate hard rules after every edit, except 3M1F and MM vs FF, which are allowed for manual edits only. Automatic pairing remains strict.
- Recalculate schedule fairness after edits.
- Undo edits.
- Reset round/schedule to generated version.
- Optional action: re-optimize remaining schedule after manual edits.

### Dynamic Players
- Add a late-arriving player during a session.
- Mark player temporarily paused.
- Mark player as left early.
- Late joiners are evaluated by eligible participation opportunities, not raw total games.
- Paused/left/not-arrived periods do not count as rest caused by the engine.

### Export / Share
- Dedicated share layout independent from viewport.
- Export schedule to PNG.
- Use Web Share API where supported to open native share sheet; LINE can then be selected by the user.
- Fallback: save/download image.

### Offline / Persistence
- PWA installable.
- App shell works offline.
- IndexedDB for player directory, sessions, drafts, schedules and history.
- Persist immediately after meaningful mutations.

## 4. Session Model
A Session represents one badminton gathering/date.
A Session may contain one or more Schedule Blocks, e.g. 17:00–18:00 and 18:00–19:00.

Historical statistics are retained, but pairing fairness is primarily calculated within the current session/block.

## 5. MVP Success Criteria
- Hard-rule violations: 0.
- Can generate schedules for 10, 11, 12, 13, 14, 15 players where valid schedules exist.
- Across 10-round simulations, target max games - min games <= 1 when constraints permit.
- Manual edits cannot silently violate hard rules.
- Reloading Safari does not lose an active session.
- Export image is readable in LINE on a phone.
- Core workflow works without network after initial app load.

## 6. Out of Scope for MVP
- Qwen / LLM / AI tie-breaker.
- Authentication/cloud sync.
- Firebase.
- Skill-level matchmaking unless added later.
- Automatic detection of when physical games end.

## Responsive UI acceptance requirement
The product must provide purpose-built layouts for mobile, iPad portrait, iPad landscape, and desktop. `references/ui-responsive-reference.png` is the approved visual reference. All core flows—session creation, generated 1-hour schedule, manual swap/replace, summary, history, and PNG/share—must remain functional at every supported form factor.
