# CEX-25 i18n, Shortcuts, and Canvas Preferences Plan

Date: 2026-06-14

## Implementation Units

1. Shortcut and preference registry
   - Add default shortcut bindings and canvas preferences.
   - Add normalization, conflict detection, import/export, storage load/save, and editable-target protection.
   - Cover the registry with unit tests.

2. Settings UI
   - Add a Settings Center panel for shortcut bindings and canvas defaults.
   - Support save, reset defaults, export, and import.
   - Show conflict messages when bindings collide.

3. Workspace integration
   - Load shortcut preferences in the project canvas workspace.
   - Use configured bindings for node search and fit-to-content.
   - Load canvas preferences in the editor and apply default node dimensions.

4. i18n and verification
   - Add zh/en text for shortcut and canvas preference UI.
   - Extend i18n tests.
   - Run frontend lint/test, full repo lint/test, and production build.

## Boundaries

- Preferences stay in localStorage for this slice.
- Browser-reserved shortcuts are ignored by conflict reporting.
- Existing hardcoded business copy can be translated incrementally in later UI polish slices.
