---
date: 2026-06-13
topic: tf-19-desktop-local-packaging-evaluation
status: completed
---

# TF-19 Desktop / Local Packaging Evaluation Requirements

## Summary

Decide whether guga-flow should add an Electron/Tauri desktop shell now or keep the Web app as the primary delivery model until the canvas-to-video MVP is stable.

## Problem Frame

Toonflow ships desktop/Electron-oriented capabilities, but guga-flow currently runs as a Web-first monorepo with a Next.js frontend, NestJS backend, worker process, Postgres, Redis, backend-owned local storage, and optional server-side local editor handoff. A desktop shell could improve local file workflows later, but it could also introduce packaging, signing, update, sidecar, and embedded service complexity before the core product loop is stable.

## Scope Decision

TF-19 is a decision slice, not a packaging implementation. It produces a durable recommendation and follow-up conditions for revisiting desktop packaging. It does not add Electron, Tauri, installer scripts, code signing, update channels, embedded databases, or native file pickers.

## Actors

- A1. Producer: wants a reliable local production tool without manually managing fragile services.
- A2. Developer/operator: needs repeatable local setup, safe provider-secret boundaries, and predictable updates.
- A3. Future desktop wrapper: may later coordinate a webview, backend/worker sidecars, app data directories, and update delivery.

## Key Flows

- F1. Packaging decision
  - **Trigger:** Product asks whether to add a desktop shell.
  - **Steps:** Evaluate Web, Electron, and Tauri against current architecture, local files, updates, provider secrets, and operational burden.
  - **Outcome:** The team has a clear now/later recommendation.
  - **Covered by:** R1, R2

- F2. Local file strategy
  - **Trigger:** User needs upload/download/editor handoff workflows.
  - **Steps:** Check whether existing backend-owned upload/download/local editor routes cover the need before introducing direct renderer filesystem access.
  - **Outcome:** Local files remain project-scoped and backend-owned until a stronger desktop-only requirement appears.
  - **Covered by:** R3, R4

- F3. Future desktop readiness
  - **Trigger:** Web MVP is stable and offline/local media requirements become primary.
  - **Steps:** Reassess sidecar, app-data storage, migration, signing, and auto-update requirements with the current process topology.
  - **Outcome:** A later desktop spike has explicit prerequisites instead of copying a reference app blindly.
  - **Covered by:** R5, R6

## Requirements

- R1. The decision must compare Web-only, Electron, and Tauri against guga-flow's current Next/Nest/worker/Postgres/Redis architecture.
- R2. The decision must state whether to build a desktop shell now and why.
- R3. The decision must define how local files should be handled before and after any future desktop wrapper.
- R4. The decision must preserve the browser/provider-secret boundary: renderer code must not gain direct provider secrets or storage-path authority.
- R5. The decision must define update/signing/release concerns that must be solved before shipping desktop builds.
- R6. The decision must define concrete revisit triggers for a future desktop spike.

## Acceptance Examples

- AE1. **Covers R1, R2.** The decision document clearly recommends Web-first for now and documents why Electron/Tauri are deferred.
- AE2. **Covers R3, R4.** The local-file section says uploads, previews, downloads, and local-editor sends remain backend-owned.
- AE3. **Covers R5.** The update section identifies signing, CI-built artifacts, channel metadata, and migration behavior as required desktop work.
- AE4. **Covers R6.** The document names triggers such as offline production, required native file watching, packaged local editor integration, or single-click local install expectations.

## Scope Boundaries

- No Electron/Tauri dependencies or scripts in this slice.
- No desktop installer, updater, native file picker, or sidecar implementation.
- No embedded Postgres/Redis decision beyond documenting the concern.
- No change to provider-secret storage or local editor handoff APIs.

## Key Decisions

- Keep guga-flow Web-first for the current MVP and do not add a desktop shell now.
- Treat a future desktop app as an adapter over the existing backend/worker boundaries, not as a reason to move generation/export/storage logic into the renderer.
- If desktop is revisited, run a focused spike after the Web MVP stabilizes and evaluate Tauri for a hosted-backend/lightweight-shell path and Electron for a bundled-Node/local-services path.
