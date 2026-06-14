# Frontend Shortcut Preferences Registry

Date: 2026-06-14

## Pattern

Keyboard behavior is centralized in `apps/frontend/src/lib/shortcuts.ts`:

- `SHORTCUT_ACTIONS` defines supported actions and default bindings.
- Normalization converts user strings and keyboard events into the same binding format.
- Conflict detection compares normalized bindings across actions.
- Import/export use a versioned JSON payload with shortcuts and canvas preferences.
- Editable target detection lives with the registry and is re-exported for legacy imports.

## Why

The previous workspace shortcuts were hardcoded in the canvas component. Centralizing them gives Settings Center a stable source of truth and keeps input-protection logic consistent.

## Guardrails

- Do not handle shortcuts when the event target is an input, textarea, select, or contenteditable element.
- Do not report browser-reserved bindings such as `Mod+R`, `Mod+L`, or `Mod+W` as configurable conflicts.
- Keep preferences local-only until there is a user settings persistence model.
- Add new shortcut actions through the registry before wiring component behavior.
