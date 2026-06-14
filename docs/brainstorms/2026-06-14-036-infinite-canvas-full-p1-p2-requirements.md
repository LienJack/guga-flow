---
date: 2026-06-14
topic: infinite-canvas-full-p1-p2
status: completed
origin: docs/infinite-canvas-reference-long-task-development-flow.md
supersedes: docs/solutions/tooling-decisions/infinite-canvas-p1-p2-split-decision-2026-06-14.md
---

# Infinite-Canvas Full P1/P2 Requirements

## Summary

After the P0 foundation, the user clarified on 2026-06-14 that the target is not only P0, but all tasks in the reference flow. This document turns IC-04 through IC-15 into guga-flow-native requirements while preserving the reference-source boundary from the P0 research contract.

## Scope Decision

Complete P1 as Web-MVP implementation work and complete P2 as decision documents plus follow-up split plans. Do not copy Infinite-Canvas source, assets, workflow files, scripts, branding, or license text.

## P1 Requirements

- R1. IC-04 asset caption/classify: project assets can be queued for captioning and classification through `GenerationJob`, processed by the worker, and written back into asset metadata.
- R2. IC-05 video reference media: image-to-video jobs carry typed first-frame, last-frame, reference-image, reference-video, and reference-audio inputs, constrained by provider capability metadata.
- R3. IC-06 ComfyUI workflow management: projects can store workflow definitions and versions, activate a version, validate source/mapping shape, and queue a safe mock `workflow_run` job that stores generated media as normal assets.
- R4. IC-07 RunningHub adapter: the workflow system must model external workflow providers through the same definition/version/run contract so RunningHub can be added without a second job model.
- R5. IC-08 canvas fragment import/export: selected canvas nodes can be exported into a versioned manifest package, and manifests can be imported with rewritten ids and audited import records.
- R6. IC-09 prompt library/skill template unification: the existing `SkillTemplate` versioning path remains the prompt-library primitive; new workflow/prompt features must not fork template storage.
- R7. IC-10 image editing backflow: image assets can be cropped or split into grids, saved as new assets with lineage metadata, and left ready for canvas backflow.
- R8. IC-11 realtime task status: the backend exposes generation events so the UI can follow queue state without relying only on manual polling.

## P2 Requirements

- R9. IC-12 desktop/local wrapper: produce an option matrix and choose the lowest-risk local distribution split after the Web MVP stabilizes.
- R10. IC-13 version check, backup, rollback: define backup and rollback boundaries across database, object storage, generated assets, and workflow definitions.
- R11. IC-14 Jimeng CLI bridge: define a secure local process boundary before adding any credentialed CLI execution.
- R12. IC-15 shared folder/browser material capture: define consent, allowlist, provenance, and dedupe rules before adding folder watchers or browser capture.

## Acceptance Examples

- AE1. **Covers R1.** A user can select assets, queue caption/classify jobs, and the worker can complete them with metadata results.
- AE2. **Covers R2.** `image_to_video` job inputs include typed `referenceMedia`, and provider capability limits reject unsupported roles.
- AE3. **Covers R3-R4.** A workflow definition can be created, versioned, activated, and run as a `workflow_run` job with an image or video output.
- AE4. **Covers R5.** Fragment export returns a manifest and package asset; import creates new node/edge ids and records success/failure.
- AE5. **Covers R6.** Prompt-library work remains tied to `SkillTemplate` rather than introducing a competing prompt storage model.
- AE6. **Covers R7.** Crop and grid split produce new image assets with `derivedFromAssetId` and edit action metadata.
- AE7. **Covers R8.** A client can subscribe to the project generation event URL and receive job update snapshots.
- AE8. **Covers R9-R12.** P2 has explicit decision documents and split plans before implementation.

## Non-Goals

- No desktop shell, updater, Jimeng CLI invocation, browser extension, or folder watcher is implemented in this slice.
- No arbitrary ComfyUI JSON execution is performed by the backend.
- No cross-project asset import is performed without explicit project-owned asset validation.
- No reference-source implementation details are copied.

## Trace Map

- IC-04 maps to asset analysis job input/output, backend generation routes, worker executor handling, asset metadata application, and asset library batch buttons.
- IC-05 maps to typed `VideoReferenceMediaInput`, provider catalog capability flags, backend validation, and worker provider input forwarding.
- IC-06 and IC-07 map to workflow definition/version/run APIs and mock workflow execution.
- IC-08 maps to canvas fragment shared types, backend export/import APIs, package assets, and import audit records.
- IC-09 maps to the existing skill template subsystem and the decision to keep it canonical.
- IC-10 maps to asset edit shared types and backend edit API.
- IC-11 maps to the generation events SSE endpoint and frontend API helper.
- IC-12 through IC-15 map to `docs/solutions/tooling-decisions/infinite-canvas-local-platform-decisions-2026-06-14.md`.
