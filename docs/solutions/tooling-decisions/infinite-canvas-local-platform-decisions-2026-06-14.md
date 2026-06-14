# Infinite-Canvas Local Platform Decisions

## Context

`docs/infinite-canvas-reference-long-task-development-flow.md` includes P2 modules for desktop/local distribution, version backup and rollback, Jimeng CLI bridging, and shared folder/browser material capture. These are platform and security boundaries rather than ordinary UI features, so this slice closes them with decisions and split plans.

## Decision

Keep guga-flow Web-first for the current implementation. Do not add a desktop shell, auto-updater, local process runner, browser extension, or folder watcher until the Web MVP storage, database, and worker lifecycles are stable.

## IC-12 Desktop / Local Wrapper

Decision: defer implementation and start with an option matrix.

Options to evaluate:

- Web-only plus documented local `pnpm` runner.
- Docker Compose local stack.
- Tauri wrapper around the existing Web app.
- Electron wrapper around the existing Web app.

First split:

- Define supported OS targets and installation expectations.
- Decide whether local storage remains filesystem-backed or moves behind a packaged service.
- Add a smoke test that starts backend, worker, and frontend from the chosen wrapper.

## IC-13 Version Check, Backup, Rollback

Decision: defer implementation until backup boundaries are explicit.

Backup units:

- PostgreSQL database.
- Local object storage path.
- Workflow definitions and active versions.
- Provider configuration without browser-held or temporary secrets.

First split:

- Add a backup manifest schema with app version, migration version, storage root, and checksum list.
- Add dry-run restore validation before destructive restore.
- Define rollback behavior when Prisma migrations are not reversible.

## IC-14 Jimeng CLI Bridge

Decision: defer implementation until local process execution is threat-modeled.

Required controls:

- User-owned credential storage outside browser-visible DTOs.
- Explicit command allowlist.
- Per-run audit records with redacted args and outputs.
- Timeout, cancellation, and stdout/stderr size limits.

First split:

- Add a local-process adapter interface that cannot execute arbitrary commands.
- Implement a mock Jimeng adapter first.
- Add failure tests for missing binary, timeout, non-zero exit, and redaction.

## IC-15 Shared Folder And Browser Material Capture

Decision: defer implementation until consent and provenance rules are designed.

Required controls:

- Explicit folder allowlist and user consent.
- File type and size limits matching asset upload rules.
- Stable provenance metadata on every imported asset.
- Dedupe strategy by checksum before creating new assets.
- Browser capture should use an extension or user-mediated import, not silent scraping.

First split:

- Add a manual shared-folder import endpoint that scans a configured allowlisted path once.
- Store `sourcePath`, `sourceChecksum`, and `importedAt` in asset metadata.
- Add browser-capture design after local import provenance is stable.

## Consequences

- P2 has a concrete route without increasing the current Web MVP blast radius.
- Security-sensitive local features remain auditable and testable before any real local execution.
- The P1 implementation can keep using the existing backend, worker, and storage lifecycle.
