# Desktop Local Packaging Web-First Decision

## Context

TF-19 asked whether guga-flow should adopt Electron/Tauri packaging or keep the Web app as the primary product surface.

The current repo is not a single static frontend. It is a pnpm monorepo with:

- Next.js frontend on `apps/frontend`.
- NestJS API on `apps/backend`.
- Worker process on `apps/worker`.
- Prisma/Postgres-backed durable state.
- Redis configuration for queue/runtime evolution.
- Backend-owned upload storage under `UPLOAD_STORAGE_DIR`.
- Optional backend-to-local-editor POST through `LOCAL_EDITOR_URL`.

No Electron, Tauri, desktop, installer, or updater dependencies/scripts exist in the repo today.

## Current Framework Facts

Primary sources checked on 2026-06-13:

- Tauri 2 uses a Webview plus Rust-side capabilities, with updater support through the updater plugin and process/shell behavior through plugins.
- Tauri sidecars can embed external binaries, including Node.js binaries, but require explicit shell permissions and sidecar packaging work.
- Electron provides a Chromium renderer plus Node-capable main process, which is a closer fit if the product must bundle Node services.
- Electron's built-in `autoUpdater` supports macOS and Windows; electron-builder provides broader packaging targets and updater/publish workflows, but requires CI artifacts, signing, and release metadata.

References:

- https://v2.tauri.app/start/
- https://v2.tauri.app/plugin/updater/
- https://v2.tauri.app/develop/sidecar/
- https://v2.tauri.app/learn/sidecar-nodejs/
- https://electronjs.org/docs/latest/api/auto-updater
- https://www.electron.build/docs/features/auto-update/
- https://www.electron.build/docs/publish/

## Decision

Keep guga-flow Web-first for the current MVP. Do not add Electron or Tauri packaging now.

Desktop packaging should be revisited only after the Web MVP is stable and a desktop-only requirement is proven. The current app still needs a reliable browser workflow, backend/worker orchestration, provider-secret management, database migration discipline, export package behavior, and local editor handoff. A desktop shell would not simplify those core risks today; it would add installer, signing, updater, embedded service, sidecar, app-data, and support burden.

## Option Comparison

### Web-First

Use the current Next/Nest/worker architecture and keep local uploads/downloads behind backend APIs.

Best now because:

- It preserves the current provider-secret and storage boundary.
- It avoids packaging Postgres/Redis/backend/worker before runtime shape stabilizes.
- It keeps verification aligned with existing `pnpm run build`, `pnpm run test`, and mock workflow gates.
- It still supports local files through upload, preview, download, and `LOCAL_EDITOR_URL` handoff.

Tradeoff:

- Users still need local services for development/self-hosted use until deployment/install tooling matures.

### Electron Later

Use if the product must bundle Node-native backend/worker processes, embedded local services, or a tightly integrated local editor.

Why it may fit later:

- The main process can coordinate Node child processes and OS integration.
- electron-builder has mature multi-platform packaging and updater workflows.

Costs:

- Larger app footprint.
- Code signing, notarization, Windows signing, update metadata, and CI release complexity.
- Renderer security discipline is mandatory; provider secrets and storage paths must stay outside renderer code.

### Tauri Later

Use if the product can remain a lightweight webview over a hosted or separately managed backend, or if the local shell only needs narrow native capabilities.

Why it may fit later:

- Smaller shell and explicit capability model.
- Updater and sidecar support exist through plugins.

Costs:

- Adds Rust/toolchain ownership.
- Bundling the current Node/Nest/worker stack requires sidecar packaging, IPC/localhost policy, and app-data path design.
- A Tauri wrapper does not remove the need to solve database and worker lifecycle management.

## Local File Strategy

Before any desktop wrapper:

- Continue using backend-owned upload, preview, download, and delete APIs.
- Keep storage keys project-scoped and resolved by `LocalStorageService`.
- Keep editor package creation in the worker/backend boundary.
- Keep `LOCAL_EDITOR_URL` server-side; browsers never receive the configured endpoint.

If desktop is introduced later:

- Map `UPLOAD_STORAGE_DIR`, export directories, logs, and caches to an OS app-data directory.
- Keep renderer code using existing HTTP/API contracts rather than direct storage paths.
- Use native file pickers only as import/export conveniences.
- Treat local editor integration as a backend/sidecar operation, not a renderer POST with secrets or package paths.

## Update And Release Requirements

Desktop distribution must not start until these are explicitly designed:

- macOS signing/notarization and Windows code signing.
- CI-built artifacts for each target platform.
- Update metadata and channel policy for stable/beta builds.
- Database migration behavior across app updates.
- Rollback story when a backend/worker/schema update fails.
- App-data directory migration and storage cleanup.
- Clear logs/support bundle policy that does not expose provider credentials.

## Revisit Triggers

Open a desktop spike only when at least one is true:

- Users need offline production without a separately managed backend.
- Users need native file watching, folder import/export, or large local media workflows that are clumsy through browser upload/download.
- The local editor integration needs one-click packaged setup rather than `LOCAL_EDITOR_URL`.
- Product distribution requires a non-technical install path for local-only users.
- The Web MVP has stable process, schema, and provider boundaries that can be wrapped without rewriting product logic.

## Consequences

- TF-19 is complete as a decision artifact; no code or package scripts were added.
- The product remains focused on stabilizing the Web MVP.
- Future desktop work has clear criteria and must preserve backend-owned secrets, storage, generation, and export boundaries.
