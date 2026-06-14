# CEX-25 i18n, Shortcuts, and Canvas Preferences Requirements

Date: 2026-06-14
Status: completed

## Goal

Make core UI language switching more complete and introduce a user-facing shortcut and canvas preference system.

## Scope

- Keep zh/en as the supported locale set.
- Add i18n coverage for the shortcut and canvas preference settings surface.
- Define a shortcut registry for common canvas actions.
- Let users view, edit, reset, export, and import shortcut settings.
- Detect visible shortcut conflicts.
- Keep shortcut handling away from inputs, textareas, selects, and contenteditable regions.
- Add canvas preferences for grid, snap, minimap, default zoom, and default node dimensions.
- Apply default node dimensions to newly created canvas nodes.

## Non-Goals

- Do not translate every deep business panel in one pass.
- Do not override browser-reserved shortcuts.
- Do not cover every tldraw internal action.
- Do not store preferences on the backend in this slice.

## Acceptance

- Settings Center exposes shortcuts and canvas preferences.
- Search and fit-to-content shortcuts in the canvas workspace read user preferences.
- Conflicts are shown in the UI and covered by tests.
- Preference import/export and reset are available.
- zh/en text exists for the new settings surface.
