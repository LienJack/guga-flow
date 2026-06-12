---
date: 2026-06-12
topic: phase-1-project-management-assets
---

# Phase 1 Project Management And Asset Library Requirements

## Summary

Phase 1 will make guga-flow usable as a single-user project workspace: users can create, open, update, duplicate, and delete projects, then upload and preview project assets before canvas and generation modules arrive.

---

## Problem Frame

Phase 0 established the engineering foundation but still leaves the product without a real entry point. The MVP needs a stable project container before later modules can attach novels, canvas state, assets, jobs, and exports to it.

The asset library is the second foundation slice: character references, location references, source images, source videos, and novel files all need server-owned storage and database records before canvas binding or provider generation can be meaningful.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input -- un-validated bets that should be reviewed before planning proceeds.*

- Phase 1 should remain a single module unless planning finds the project and asset work too large to review together.
- The app remains single-user in MVP: ownership is represented through a default user and project owner relationship, not login, RBAC, or team permissions.
- Uploaded files are stored through a server-side local storage abstraction, while the browser only receives safe metadata and preview URLs.
- Project duplication copies project metadata and may reuse existing asset references or URLs in MVP; it does not need to physically duplicate asset files.
- Asset deletion in Phase 1 can remove the asset record and its local uploaded object, while later modules will define safer behavior for generated assets referenced by canvas nodes.

---

## Actors

- A1. Creator: starts and manages video-production projects.
- A2. Downstream canvas/generation modules: depend on project and asset records as stable parents.
- A3. Backend storage boundary: owns file validation, persistence, and preview URL generation.

---

## Key Flows

- F1. Project bootstrap
  - **Trigger:** A1 wants to start a new video project.
  - **Actors:** A1
  - **Steps:** A1 views the dashboard, creates a project with title and optional defaults, then opens the project's canvas route.
  - **Outcome:** A project exists with owner metadata and can become the parent for later canvas, novel, asset, and generation records.
  - **Covered by:** R1, R2, R3, R4

- F2. Asset upload and preview
  - **Trigger:** A1 wants to add source material or references to a project.
  - **Actors:** A1, A3
  - **Steps:** A1 selects an image, video, txt, or md file; the backend stores it; the asset appears in the project asset library; A1 previews supported media or document metadata.
  - **Outcome:** The asset is represented as a project-scoped record with safe preview behavior.
  - **Covered by:** R7, R8, R9, R10, R11

- F3. Project lifecycle management
  - **Trigger:** A1 needs to organize or clean up projects.
  - **Actors:** A1
  - **Steps:** A1 edits project metadata, duplicates a project, or confirms deletion.
  - **Outcome:** Project lifecycle actions are explicit, visible, and do not silently destroy unrelated assets or future canvas state.
  - **Covered by:** R3, R5, R6, R12

---

## Requirements

**Project workspace**

- R1. The app must provide a project dashboard that lists available projects with enough metadata for A1 to identify and open recent work.
- R2. A1 must be able to create a project with a title and default aspect ratio.
- R3. A1 must be able to open a project and land on the project canvas route, even if the actual tldraw canvas implementation is deferred to Phase 2.
- R4. Every project must be associated with the MVP default owner so later records can remain project-scoped without adding authentication.
- R5. A1 must be able to edit basic project metadata after creation.
- R6. A1 must be able to delete a project only after an explicit confirmation step.
- R7. A1 must be able to duplicate a project's basic metadata; duplicated projects do not need to copy every asset file in Phase 1.

**Asset library**

- R8. A1 must be able to upload images, videos, txt, and md files into a specific project.
- R9. Uploaded files must be validated server-side for supported type and reasonable size before becoming asset records.
- R10. Uploaded assets must be stored server-side and recorded as project-scoped assets with type, purpose, filename, mime type, size, and preview metadata when available.
- R11. The project UI must show an asset library with list/grid browsing, type labels, and basic details.
- R12. Image assets must have an inspectable preview, video assets must have a playable preview, and text/markdown assets must expose readable metadata or text preview.
- R13. A1 must be able to delete an uploaded asset from the project asset library before later canvas/generation references exist.

**Boundaries and handoff**

- R14. Provider keys and real generation providers remain out of scope; Phase 1 must not introduce browser-side provider credentials.
- R15. The asset library must be ready for later canvas binding: project-scoped assets should be addressable by later modules without duplicating upload logic.
- R16. Phase 1 must preserve the canvas-first path by making project open actions lead toward the canvas experience, not a generic CRUD-only admin app.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3, R4, R16.** Given a fresh Phase 1 app, when A1 creates a project from the dashboard, the project appears in the list and opening it routes to the project's canvas path.
- AE2. **Covers R5, R6, R7.** Given an existing project, when A1 edits, duplicates, or deletes it, the UI reflects the changed lifecycle state and deletion requires confirmation.
- AE3. **Covers R8, R9, R10, R11.** Given an existing project, when A1 uploads a supported file, the backend records the asset and the project asset library shows it with safe metadata.
- AE4. **Covers R12.** Given uploaded image, video, and markdown assets, when A1 selects each one, the UI shows the expected preview or readable metadata without requiring real provider credentials.
- AE5. **Covers R13, R15.** Given an uploaded asset with no later canvas or generation references, when A1 deletes it, it disappears from the project asset library and storage cleanup is attempted.

---

## Success Criteria

- A developer can demonstrate project create/open/update/delete/duplicate and upload/preview/delete assets using local app surfaces.
- Downstream modules can rely on stable project and asset records without redesigning ownership, storage, or preview boundaries.
- The UI remains oriented around opening a project canvas, even before the persistent canvas module exists.
- Real provider credentials remain unnecessary for all Phase 1 verification.

---

## Scope Boundaries

- Do not implement login, RBAC, teams, sharing, or multi-user collaboration.
- Do not implement tldraw load/save or real canvas editing behavior; Phase 1 only routes to the future canvas surface.
- Do not implement asset drag/drop binding to canvas nodes; that belongs to Phase 4.
- Do not implement novel parsing, storyboard generation, image generation, video generation, or editor export.
- Do not implement remote object storage providers; local storage abstraction is enough for MVP.
- Do not implement generated-asset reference safety beyond uploaded assets with no downstream references; later modules will define generated asset retention rules.

---

## Key Decisions

- Keep Phase 1 mock-first and provider-free: asset upload/preview is local product infrastructure, not a reason to introduce real model providers.
- Keep single-user ownership explicit: default owner relationships are enough for MVP while avoiding permission-system scope.
- Make the project dashboard canvas-directed: a project opens into the canvas route so later Phase 2 work extends the same user path.

---

## Dependencies / Assumptions

- Phase 0 Prisma foundation, backend app, frontend app, and local storage directories are available.
- Later Phase 2 will replace the placeholder canvas route with persistent tldraw behavior.
- Later Phase 4 and Phase 7 will reuse uploaded assets for semantic binding and character/location reference workflows.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R8, R9, R10][Technical] Decide exact upload size limits, MIME validation approach, and how previews are served from local storage.
- [Affects R2, R5][Technical] Decide whether default aspect ratio remains a fixed option set or allows free-form values in Phase 1.
- [Affects R13][Technical] Decide the safest deletion behavior for local object cleanup failures while keeping UI feedback clear.
