---
date: 2026-06-13
topic: phase-11-editor-export
---

# Phase 11 EditorBridge And Export Package Requirements

## Summary

Phase 11 completes the MVP handoff from generated VideoNodes to an editor-ready package. A creator can select VideoNodes, choose an ordering rule, create a durable export job, receive a downloadable zip containing `timeline.json`, `storyboard.csv`, and clips, and optionally send that package to a local editor endpoint without losing the download path when the local POST fails.

---

## Problem Frame

Earlier phases can create project-scoped VideoNodes through mock and real video generation, but the product loop still stops inside the canvas. The MVP definition of done requires generated clips to leave the canvas as a traceable editor package, with enough manifest and storyboard metadata that an editor or downstream workflow can reconstruct sequence, timing, source node lineage, and clip files.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input - un-validated bets that should be reviewed before planning proceeds.*

- The first implementation should prioritize a downloadable zip as the dependable editor handoff; `LOCAL_EDITOR_URL` is an optional convenience path layered on top.
- The export package should use selected VideoNodes only; exporting unselected project videos, images, audio, or subtitles is outside this module.
- Manual ordering can be represented by the current selected-node order until a later dedicated timeline reorder UI exists.
- A failed local editor POST should not fail the export job if the zip package was created successfully.

---

## Actors

- A1. Creator: selects generated VideoNodes, chooses export order, downloads the package, and optionally sends it to a local editor.
- A2. Backend: validates selected nodes, creates durable export/job records, owns project storage, creates graph side effects, serves downloads, and performs server-side local editor POSTs.
- A3. Worker: claims export jobs, reads source clip bytes through server-owned boundaries, builds timeline/storyboard artifacts, and packages the zip.
- A4. Local editor bridge: optional HTTP target configured by `LOCAL_EDITOR_URL` that receives a package handoff and may return an open URL.

---

## Key Flows

- F1. Selected VideoNode export
  - **Trigger:** The creator multi-selects VideoNodes and starts an editor export.
  - **Actors:** A1, A2, A3
  - **Steps:** The frontend sends selected VideoNode ids and sort mode; the backend validates the nodes and their video Assets; an `editor_export` GenerationJob and EditorExport record are queued; the worker builds package artifacts; the backend persists the zip and marks the export succeeded.
  - **Outcome:** The creator has a durable EditorExport with a downloadable package Asset.
  - **Covered by:** R1, R2, R3, R4, R5, R6, R7, R8

- F2. Package download and graph trace
  - **Trigger:** An export job completes.
  - **Actors:** A1, A2
  - **Steps:** The backend creates an EditorPackageNode, connects selected VideoNodes to it with `sent_to_editor` edges, exposes export status and download metadata, and serves the package zip from backend storage.
  - **Outcome:** The canvas remains the traceable production source for the exported package, and refresh restores the package node and edges.
  - **Covered by:** R8, R9, R10, R11, R12

- F3. Local editor send
  - **Trigger:** The creator sends a completed export to the configured local editor.
  - **Actors:** A1, A2, A4
  - **Steps:** The backend checks `LOCAL_EDITOR_URL`; if configured, it POSTs server-side package and manifest metadata; success returns an editor URL or acknowledgement; failure is recorded and shown without deleting the package.
  - **Outcome:** Local editor handoff is useful when available and non-blocking when unavailable or failing.
  - **Covered by:** R13, R14, R15, R16

- F4. Failed export recovery
  - **Trigger:** Export packaging fails because selected nodes are invalid, clip assets are missing, storage fails, or the worker rejects the job.
  - **Actors:** A1, A2, A3
  - **Steps:** The job/export records move to failed with a readable error; no partial package is presented as complete; retry creates a new queued job from the same selected VideoNodes.
  - **Outcome:** Failure is visible and recoverable without corrupting graph state.
  - **Covered by:** R2, R5, R6, R12, R17

---

## Requirements

**Selection and ordering**

- R1. The export workflow must start from an explicit multi-selection of VideoNodes.
- R2. The backend must reject selected nodes that are missing, outside the project, not VideoNodes, or not backed by a video Asset.
- R3. The creator must be able to choose an export sort mode of `shot_index`, `canvas_x`, or `manual`.
- R4. Export ordering must be deterministic for the same selected nodes and sort mode.

**Package contents**

- R5. Export must create a durable `GenerationJob` with operation `editor_export` and enough input data to retry the package without relying on browser state.
- R6. Export packaging must produce a zip containing `timeline.json`, `storyboard.csv`, and a `clips/` directory with one clip file per exported VideoNode.
- R7. `timeline.json` must include project identity, aspect ratio, fps, ordered timeline items, source VideoNode ids, source Asset ids, durations when known, and package version.
- R8. `storyboard.csv` must include one row per exported clip with ordered index, VideoNode title, source shot context when available, asset id, and filename.

**Persistence and canvas trace**

- R9. The package zip must be saved as a project Asset with purpose `editor_package`.
- R10. A succeeded export must update or create an `EditorExport` record that points to the package Asset and stores timeline/storyboard metadata.
- R11. A succeeded export must create an EditorPackageNode on the canvas with package metadata and connect selected VideoNodes to it with `sent_to_editor` edges.
- R12. Export status must be visible through API/UI states for queued, running, succeeded, and failed work.

**Local editor handoff**

- R13. `LOCAL_EDITOR_URL` must stay server-side and must not be exposed as a browser-entered secret or client-side fetch target.
- R14. Sending to a local editor must be available only after package creation succeeds.
- R15. A successful local editor POST must return a visible open URL or acknowledgement when the local editor provides one.
- R16. A failed or missing local editor POST must leave the package downloadable and show the handoff failure separately from package success.

**Failure and retry**

- R17. Packaging, validation, storage, and local editor errors must produce readable states without silently deleting selected VideoNodes, package nodes, or completed package Assets.
- R18. Retrying a failed export must create a new queued export job from the original selected VideoNodes and sort settings.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R5, R6, R9, R10, R11, R12.** Given three succeeded VideoNodes with video Assets are selected, when the creator starts export, the worker creates a succeeded EditorExport, a package Asset, an EditorPackageNode, `sent_to_editor` edges, and a downloadable zip.
- AE2. **Covers R3, R4, R7, R8.** Given selected VideoNodes with shot numbers and canvas positions, when exports are run with `shot_index` and `canvas_x`, each package has deterministic clip order and matching `timeline.json` / `storyboard.csv` rows.
- AE3. **Covers R6, R7, R8, R9.** Given an export completes, when the zip is inspected, it contains `timeline.json`, `storyboard.csv`, and `clips/shot_001...` files whose manifest entries reference the selected VideoNode and Asset ids.
- AE4. **Covers R13, R14, R15.** Given `LOCAL_EDITOR_URL` is configured and a package exists, when the creator sends it, the backend POSTs to the local editor and returns the editor open URL or acknowledgement.
- AE5. **Covers R16, R17.** Given `LOCAL_EDITOR_URL` is not configured or the POST fails, when the creator sends a completed export, the UI shows the handoff failure while the package download remains available.
- AE6. **Covers R2, R17, R18.** Given a selected VideoNode references a missing video Asset, when export runs, the job/export fails with a readable error and retry preserves the original selected node ids and sort mode.

---

## Success Criteria

- A creator can multi-select three VideoNodes and create a valid editor package zip without real provider keys.
- The package can be downloaded and inspected for `timeline.json`, `storyboard.csv`, and clip files.
- The canvas shows a traceable EditorPackageNode and `sent_to_editor` edges after refresh.
- Optional local editor handoff succeeds when configured and degrades gracefully when missing or failing.
- `ce-plan` can proceed without inventing export selection, ordering, package contents, local editor failure behavior, or retry semantics.

---

## Scope Boundaries

- In scope: selected VideoNode export, deterministic ordering, timeline manifest, storyboard CSV, zip packaging, package Asset persistence, EditorExport API, EditorPackageNode side effects, local editor POST, download API, status UI, docs, tests, and smoke evidence.
- Out of scope: timeline editing UI, audio tracks, subtitle generation, image export folders beyond clip support needed for MVP, iframe `postMessage`, real desktop editor plugins, webhook callbacks from editors, cloud editor upload, package sharing permissions, and cost/accounting features.
- Phase 12 owns broader productivity features such as search, minimap, SceneFrame collapse, shortcuts, and node version management.

---

## Key Decisions

- Use zip download as the primary bridge: it is deterministic, mock-first, and satisfies the MVP even when no local editor is running.
- Model export as a durable job: `editor_export` belongs in the same visible GenerationJob lifecycle as media generation so failure, retry, and queue state remain consistent.
- Keep local editor handoff server-side: `LOCAL_EDITOR_URL` is a trusted local/backend integration point, not a browser-managed provider setting.
- Preserve canvas traceability: exported packages must become business nodes and semantic edges rather than a detached download artifact.

---

## Dependencies / Assumptions

- Phase 8-10 generation flows can create VideoNodes with `assetId` values in `dataJson`.
- The existing `EditorExport` Prisma model and `editor_package` CanvasNode type are available but not yet wired into API/UI/worker behavior.
- The local worker and backend can exchange package outputs through existing worker endpoints or narrowly extended worker endpoints.
- Clip bytes are available through backend-owned storage or preview routes; the browser does not read local storage paths for packaging.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R6][Technical] Which zip library or internal packaging utility should be used in the worker while keeping the implementation testable?
- [Affects R7, R8][Technical] What exact source shot context is currently recoverable from VideoNode, ImageNode, ShotNode, and generated edges?
- [Affects R11][Technical] Where should the EditorPackageNode be placed relative to selected VideoNodes so it is visible without overlapping existing nodes?
