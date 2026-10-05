# PWA Specification

## Recommended Stack
- React
- TypeScript
- Vite
- PWA plugin/service worker
- IndexedDB (Dexie or a small wrapper)
- CSS system: Tailwind CSS or equivalent responsive utility approach
- Testing: Vitest + Playwright

## PWA Requirements
- Installable from Safari/Chrome where platform permits.
- Standalone display mode.
- App shell cached for offline launch.
- No network required for pairing generation, manual editing, history, or export after assets are cached.
- Versioned IndexedDB migrations.

## Safari / iPad Considerations
- Avoid browser-only APIs without feature detection.
- Web Share API must have fallback.
- PNG generation must work without server dependency.
- Test portrait/landscape viewport changes.
- Persist draft state frequently to survive tab/process eviction.

## Sharing
Preferred:
1. Render dedicated share card to canvas/image.
2. Create PNG Blob/File.
3. If navigator.share supports files, invoke share sheet.
4. Otherwise provide Save Image / Download fallback.

Do not claim direct LINE posting; user chooses LINE from native share sheet when available.

## Offline Data
All core user data remains local in IndexedDB in MVP.
Provide Settings action to export/import backup JSON in a later phase or if implementation budget allows.
