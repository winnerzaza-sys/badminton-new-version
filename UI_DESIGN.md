# UI Design — Responsive PWA

## Approved Material 3 pastel-blue design — 9 October 2026

The approved preview supersedes the earlier glass/gray skin. Use a flat pale-blue
background (#f5f9ff), blue tonal headers/navigation (#dceafd / #edf3fc), blue primary
controls (#4775b2), white rounded panels and dark text (#29384d). Keep Court 1 mint,
Court 2 pink and Rest blue; retain amber replay badges. Flaticon UIcons Regular
Rounded are bundled locally and precached for offline use, with attribution in
Settings. The shuttlecock mark decorates branding and session headers.

Keep real body text, player names and form controls at least 16px, rather than the
smaller labels in the conceptual preview. Wide layouts retain the full schedule,
roster and statistics, with a compact left navigation rail and two court cards above
a full-width rest area. Portrait tablets keep compact top navigation and larger
touch cards; phones keep stacked courts, round lists and persistent bottom navigation.
The dedicated PNG composition remains data-driven and uses the same pastel palette.

## Requested visual refinement — October 2026
Ant Design controls: all dropdowns use Select, with search for larger option lists.
Fixed-partner dropdowns disable typing/search and select directly from the roster.
Body text and controls use a minimum 16px, retaining heading sizes and decorative
icons. Today's roster checkboxes are 9.5px (50% of the original 19px), with the
whole row remaining a touch target and flexible name space. Start time uses Ant
Design TimePicker with 24-hour HH:mm, touch-friendly time rows and explicit
confirmation after choosing hours/minutes. The picker popup stays within the viewport.
Play setup uses a vertical Form, DatePicker, TimePicker and InputNumber; the player
editor uses Modal/Form/Input/Select. Confirmation dialogs await an explicit
confirm/cancel result before persistence. Errors, warnings and persistent success
feedback use Alert; saving a player also shows a message. Keep native court cards,
touch swapping, navigation layouts and the deterministic canvas export. Primary
controls remain at least 44px; tablet setup remains two columns. Calendar values
are stored as local YYYY-MM-DD and HH:mm strings, preserving the domain model.

Typography: use locally hosted Prompt for headings/titles (including branding,
table headers and exported PNG headings), and Sarabun for body text and controls.
Regular, semibold and bold files are included with their OFL licenses and cached
for offline use. PNG export explicitly loads both font families before measuring.

Keep the reference's layout hierarchy and green/pink/blue court/rest semantics.
The approved pastel-blue theme uses rounded opaque surfaces and the locally bundled
Flaticon shuttlecock mark. App surfaces and buttons use flat colors without gradients.
Export composition remains independent from the viewport.

Play settings use two columns across 768–1199px, rather than the initial three,
to allow comfortable tablet controls. Labels and controls must allow shrinking
inside their grid tracks, including the date/time pickers. Browser checks
cover 768, 820, 1024 and 1180px, as well as mobile, desktop and mobile WebKit.

## Visual Direction
Friendly, modern badminton utility UI.
- Light background.
- Rounded cards.
- Strong blue primary actions.
- Court 1 may use a subtle green surface.
- Court 2 may use a subtle warm/pink surface.
- Rest area uses a subtle blue/neutral surface.
- High contrast text and large touch targets.
- Avoid overly decorative UI during courtside use.

## Core Navigation
Primary sections:
- Home / Generate Schedule
- Schedule
- Adjust Pairing
- Summary
- History
- Players
- Settings

## Home
Show:
- New Schedule / New Session CTA
- Continue current session when present
- Recent sessions
- Player directory shortcut

## New Session / Schedule Setup

Court display names can be edited in setup (e.g. B5/B6), or through
"แก้ไขชื่อสนาม" in an active schedule block. Names appear in court cards,
schedule tables, mobile round lists and PNG exports. Empty names and older
records fall back to สนาม 1/สนาม 2. Each block saves its own names; added
blocks inherit the last block's names. Completed sessions remain read-only.
Fields:
- date
- start/end time
- duration
- court count
- points per game
- planned rounds
- player selection

Default player selection = selected players from most recent session.
Allow Select All / Clear Selection / Add Player.

## Schedule View
Planned consecutive-play badges use a replay icon plus a count beside each
playing player's name in selected-round cards, the full schedule table/mobile
list and the PNG export. Show from two consecutive rounds, including the round
being displayed. The explanation above each schedule/export uses a sample
replay badge with count 3. A non-playing round resets the count; the next block
carries its saved baseline streak. Derive badges from the current plan after
edits/undo/regeneration, without marking physical games complete or changing
pairing rules. Amber badges preserve the green/pink/blue court/rest semantics.
Court headings, round links and gender labels retain their original hue families
with darker text for accessible contrast. PNG names/badges wrap to fit each column.

Show all planned rounds.
Each round contains:
- estimated time
- Court 1
- Court 2 (when applicable)
- Resting players

Actions:
- Regenerate
- Adjust schedule
- Export / Share
- Summary

## Manual Adjustment
- Mobile: tap player A, then player B to swap.
- Tablet/Desktop: support drag-and-drop and tap-to-swap.
- Resting players can replace playing players.
- Fixed pair displays lock indicator.
- Invalid edit shows concise reason and does not apply.
- Show Undo and Reset to Generated.
- Show live fairness score delta after valid edit.

## Mobile (<768)
Bottom navigation.
Schedule is round cards stacked vertically.
One round focuses on:
- Court 1 card
- Court 2 card
- Rest card
Avoid dense wide tables.
Use tap-to-swap as primary interaction.

## iPad Portrait
Top/session header + bottom navigation or compact tabs.
Show one selected round as large court cards.
Provide horizontal round selector (1–6).
Below it, show compact all-round schedule or summary.
Manual adjustment optimized for touch.

## iPad Landscape
Primary courtside layout.
Suggested structure:
- Left: navigation + current/recent session context.
- Center top: selected round with Court 1, Court 2, Rest.
- Center bottom: full schedule table for all rounds.
- Right: player roster / current statistics.
Header: date/time, players, courts, points, rounds, share action.
This layout should minimize modal navigation.

## Desktop
Use available width:
- Left sidebar navigation.
- Main schedule table.
- Right panels for fairness and per-player game counts.
- Manual adjustment can use a large workspace/modal.

## Share Preview
Dedicated fixed-size composition; do not screenshot the current responsive UI.
Content:
- title (e.g. BADMINTON NIGHT)
- date and time
- player/court/round count
- all rounds with Court 1 / Court 2 / Rest
- optional compact game-count summary

Must remain legible when viewed inside LINE on a phone.

## Accessibility / Usability
- Minimum touch target ~44px.
- Do not communicate gender/status by color alone.
- Confirm destructive actions.
- Avoid accidental drag on scrolling mobile screens.
- Use Thai-first copy; architecture should allow localization later.

---

# Visual Source of Truth (Required)

Before implementing or changing UI, inspect:

`references/ui-responsive-reference.png`

This image is the visual source of truth for the responsive application. The written specification explains behavior and responsive intent; when visual styling is ambiguous, follow the reference image while preserving accessibility and usability.

## Required responsive layouts

### Mobile (< 768px)
- Single-column, touch-first layout.
- Persistent/compact bottom navigation where appropriate.
- Session summary and primary action appear near the top.
- Current round is rendered as stacked cards: Court 1, Court 2, Rest.
- Full schedule is presented as mobile-friendly round cards/list, not a squeezed desktop table.
- Manual adjustment supports tap-player -> tap-player swap; drag and drop may be additive but must not be required.
- Primary buttons must be thumb-friendly and remain readable without horizontal page scrolling.

### iPad portrait (768px–1023px)
- Use the portrait tablet composition shown in the reference.
- Header contains session metadata and Generate/Create Schedule action.
- Court cards may appear side-by-side when width permits; Rest is visually distinct.
- Round selector/tabs provide quick navigation across the generated hour.
- Bottom navigation or compact tablet navigation is acceptable, matching the reference hierarchy.
- Manual adjustment must be touch optimized.

### iPad landscape (1024px–1199px)
- This is the primary courtside workspace.
- Left: navigation/session context.
- Center: selected round court cards plus the full 1-hour schedule table.
- Right: active player roster and current statistics.
- Court 1, Court 2, and Rest must be visible together for the selected round.
- Drag-and-drop swapping is supported, with tap-to-swap fallback.
- Do not stretch mobile cards to fill the screen; use the multi-pane composition from the reference.

### Desktop (>= 1200px)
- Dense but readable management dashboard.
- Left navigation, large central schedule workspace, and right-side fairness/player summary.
- Prefer the full schedule table as the main artifact.
- Provide clear actions for manual editing, export PNG, and LINE/share flow.
- Use the extra width for statistics rather than oversized typography/cards.

## Visual language
- Light, clean sports-dashboard aesthetic.
- White/light neutral surfaces with subtle shadows.
- Rounded cards and controls; avoid excessive borders.
- Blue is the primary action/accent family.
- Court 1 uses a soft green treatment; Court 2 uses a soft pink/red treatment; Rest uses a soft blue treatment, consistent with the reference.
- Typography should prioritize Thai readability and clear numeric scanning.
- Player avatars may use initials or neutral placeholders; implementation must not depend on generated portrait artwork.
- Use generous touch targets (minimum ~44px) and clear selected/disabled states.

## Shared LINE/export image
The exported schedule image is intentionally independent from the current viewport. Mobile, tablet, and desktop must generate the same share-friendly composition from schedule data. Follow the LINE preview in the reference: event header, round rows, Court 1/Court 2/Rest, and compact game-count summary.

## Responsive acceptance criteria
1. No horizontal page scrolling at standard mobile widths.
2. Mobile does not render the desktop schedule table at an unreadably small scale.
3. iPad portrait and landscape have intentionally different compositions.
4. iPad landscape exposes selected round + full schedule + player context without navigating to separate pages for routine operation.
5. Desktop uses multi-column space rather than simply enlarging tablet UI.
6. Manual swap is usable with touch and mouse.
7. Export image output is deterministic and viewport-independent.
8. Core functionality remains usable as an installed PWA in standalone mode.
