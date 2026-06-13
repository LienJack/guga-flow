# Settings Center Safe Export And Validation

## Context

TF-17 needed to gather provider/model settings, prompt/skill management, project defaults, data operations, file status, and version metadata into one settings center. Several of these areas touch sensitive state, especially provider credentials.

## Decision

The settings center uses a backend-owned summary/export boundary:

- `GET /projects/:projectId/settings` returns safe operational metadata.
- `GET /projects/:projectId/settings/export` returns a safe JSON export.
- `POST /projects/:projectId/settings/import/validate` validates payload shape without writing data.

The frontend groups modules with stable anchors and reuses existing Provider and Skill panels rather than moving their business logic.

## Consequences

- Users can inspect common project configuration without manual DB queries.
- Provider credentials remain excluded from browser-readable exports; only presence/source metadata is exported.
- Import is intentionally validation-only, avoiding unresolved merge/restore semantics.
- Future restore support should introduce explicit conflict policy, secret handling, and audit history instead of extending the validation endpoint into a write path.
