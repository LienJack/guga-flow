# Infinite-Canvas P1/P2 Split Decision

## Superseded Note

This decision was superseded on 2026-06-14 after the user clarified that the requested scope is not only P0, but all tasks in `docs/infinite-canvas-reference-long-task-development-flow.md`. The active full-scope requirements and plan are:

- `docs/brainstorms/2026-06-14-036-infinite-canvas-full-p1-p2-requirements.md`
- `docs/plans/2026-06-14-036-feat-infinite-canvas-full-p1-p2-plan.md`
- `docs/solutions/tooling-decisions/infinite-canvas-local-platform-decisions-2026-06-14.md`

## Context

`docs/infinite-canvas-reference-long-task-development-flow.md` defines completion differently from cloning every Infinite-Canvas feature. The completion rule is:

- P0 modules all pass the CE loop and have tests.
- P1 modules that are product-confirmed are completed or explicitly deferred.
- P2 modules have decision documents and follow-up split plans.

This decision closes the non-P0 scope for the 2026-06-14 P0 implementation.

## Decision

Complete P0 now and defer P1 implementation until each module is product-confirmed with a narrower requirement document. Keep P2 platform work as decision-only until the Web MVP is stable.

The implemented P0 foundation is intentionally sufficient for later P1 modules:

- Provider params and discovery support future workflow/provider configuration.
- Asset collections and tags support future caption/classify/search.
- Reference-aware deletion protects future canvas/workflow outputs.
- Worker runtime config can carry safe provider params without exposing browser secrets.

## P1 Split Plan

### IC-04 Asset Caption / Classify

Open as a dedicated asset-analysis module after a provider choice is confirmed.

Minimum split:

- Add `asset_caption` / `asset_classification` generation operations.
- Store caption/classification in `Asset.metadataJson` first.
- Surface captions in asset search and prompt composer.
- Add mock analyzer tests before real provider tests.

### IC-05 Video Provider Reference Media

Open after video model targets are confirmed.

Minimum split:

- Extend video job input for first frame, last frame, reference images, reference video, and reference audio.
- Preserve current worker/provider secret boundary.
- Add provider-specific capability flags and disabled-state UI.

### IC-06 ComfyUI Workflow Management

Open only after workflow schema and security constraints are confirmed.

Minimum split:

- Add workflow definition/version schema.
- Validate workflow JSON and field mappings without executing arbitrary code.
- Run workflow execution in worker and save every output as `Asset`.

### IC-07 RunningHub Workflow / App Adapter

Open after RunningHub API targets and auth model are confirmed.

Minimum split:

- Add adapter metadata separate from ComfyUI workflow definitions.
- Map external task states into `GenerationJob`.
- Store raw upstream payloads only after redaction.

### IC-08 Canvas Fragment Import / Export

Open after fragment portability rules are confirmed.

Minimum split:

- Define versioned fragment schema.
- Rewrite ids and remap asset references on import.
- Audit every import with success/failure summary.

### IC-09 Prompt Library And Skill Template Unification

Open after users confirm whether prompt library is separate from existing skill templates.

Minimum split:

- Prefer reusing `SkillTemplate` unless prompt library needs different permissions or versioning.
- Preserve prompt trace in generation jobs.
- Add import/export validation.

### IC-10 Image Editing Backflow

Open after target edit primitives are confirmed.

Minimum split:

- Add edit operation inputs and lineage metadata.
- Return edited media as new `Asset` records.
- Link source and output nodes with semantic edges.

### IC-11 Realtime Task Status

Open after queue UX requirements are confirmed.

Minimum split:

- Decide SSE vs polling for the current deployment shape.
- Keep worker state authoritative in `GenerationJob`.
- Add reconnect and stale-state behavior tests.

## P2 Decision And Split Plan

Keep these modules decision-only for now:

- IC-12 Desktop / local wrapper.
- IC-13 Version check, backup, rollback.
- IC-14 Jimeng CLI bridge.
- IC-15 Shared folder and browser material capture.

The current decision remains Web-first. Do not add Electron, Tauri, updater, CLI bridge, browser extension, or local folder scanner in this slice.

Future split:

- IC-12 should begin with an option matrix: Web-only, Tauri, Electron, Docker Desktop, pnpm wrapper.
- IC-13 should begin with database migration rollback and storage backup requirements.
- IC-14 should begin with a security review for CLI credentials, local process execution, and audit logs.
- IC-15 should begin with explicit user consent, path allowlisting, and file import provenance.

## Revisit Triggers

Reopen P1/P2 work only when one of these is true:

- A creator workflow cannot be completed with the current P0 provider and asset foundation.
- A specific provider/workflow target is named and product-approved.
- Local-only production, folder import, browser capture, or packaged install becomes a required distribution path.
- The Web MVP has stable backend, worker, database, and storage lifecycle boundaries.

## Consequences

- P0 is complete as implementation work.
- P1 is explicitly deferred into product-confirmed modules rather than bundled into one high-risk change.
- P2 has a concrete follow-up split plan and preserves the current Web-first architecture.
