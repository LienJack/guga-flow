---
title: "Treat Editor Export Packages as Backend-Owned Generation Side Effects"
date: 2026-06-13
category: architecture-patterns
module: phase-11-editor-export-package
problem_type: architecture_pattern
component: editor_export
severity: medium
applies_when:
  - "Packaging selected VideoNodes into editor handoff artifacts"
  - "Adding worker tasks that need source asset bytes"
  - "Creating package Assets and canvas trace nodes from async work"
  - "Integrating optional local editor or desktop handoff endpoints"
related_components:
  - backend_editor_exports_api
  - backend_generation_completion
  - worker_package_builder
  - asset_lifecycle
  - normalized_canvas_graph
tags:
  - editor-export
  - worker
  - package-asset
  - backend-boundary
  - local-editor
---

# Treat Editor Export Packages as Backend-Owned Generation Side Effects

## Context

Phase 11 adds the handoff from generated VideoNodes to an editor-ready ZIP. The workflow starts in the canvas Inspector, but the browser must not read storage paths, assemble clip bytes, or call a local editor endpoint directly.

The export touches several durable surfaces at once: selected VideoNode validation, package bytes, `Asset` persistence, `EditorExport` status, an `editor_package` CanvasNode, `sent_to_editor` edges, worker failure state, and optional local editor delivery.

## Guidance

Keep export creation, package persistence, and graph side effects owned by backend services. Let the worker build the package and report structured output.

Use this split:

```text
Browser -> Backend: selected VideoNode ids + sort mode
Backend -> DB: EditorExport + editor_export GenerationJob
Worker -> Backend: claim job and fetch source clip bytes through backend asset preview
Worker -> Backend: packageOutput with ZIP bytes, timeline, storyboard CSV, clip trace
Backend -> Storage/DB: package Asset, EditorExport update, package node, sent_to_editor edges
Browser -> Backend: download package or ask backend to send to LOCAL_EDITOR_URL
```

Persist the canonical export input in the job. It should include selected VideoNode ids, sort mode, FPS/aspect ratio, and ordered clip sources with video Asset ids. Do not depend on browser selection state after queueing.

Treat package success and local editor send as separate states. A package succeeds when the ZIP and graph trace are durable. `LOCAL_EDITOR_URL` failures should return a handoff error while keeping the package downloadable.

Synchronize every `editor_export` `GenerationJob` lifecycle branch back to `EditorExport`. Worker claim should set the export to `running`, worker failure should set it to `failed`, retry should restore it to `queued`, and cancellation should move it to a readable failed/cancelled-equivalent state until the export model has a dedicated `cancelled` enum. Do not only update source or target CanvasNode status, because export jobs do not have ordinary media source nodes.

Bound optional local editor POSTs with a short timeout. A configured but unresponsive local editor should return a visible handoff failure while preserving the successful package download path.

In frontend state matching, include every semantic package input, not only selected VideoNode ids. For example, `shot_index` and `canvas_x` exports over the same videos are different artifacts and must not share a download link or status chip.

Prefer a narrow package builder utility with tests over spreading ZIP or CSV assembly through the runner. The Phase 11 implementation uses a deterministic stored-ZIP writer, which avoids a new dependency while still making ZIP entries testable.

## Why This Matters

Editor export is easy to accidentally implement as a browser download helper. That would break the project boundaries: browser code would need storage details, worker failures would be invisible, and the canvas would lose traceability after handoff.

Keeping completion inside the backend lets the export look like the rest of the product graph. The package becomes a normal project Asset, the canvas gets a visible EditorPackageNode, and selected clips have semantic `sent_to_editor` edges that survive refresh.

Separating local editor send also keeps mock-first verification dependable. A developer can prove the MVP handoff by inspecting the ZIP even when no local editor receiver is running.

## When to Apply

- Adding new export formats such as XML, EDL, FCPXML, or sidecar subtitle bundles.
- Adding audio, subtitle, image, or proxy media folders to the package.
- Adding cloud editor upload or desktop editor integrations.
- Reviewing worker changes that read source asset bytes.
- Adding retry, cancellation, or progress states for package generation.

## Related

- [Keep Generation Worker Side Effects Behind the Backend Boundary](./generation-worker-backend-side-effects-2026-06-12.md)
- [Project-scoped asset lifecycle boundary](./project-scoped-asset-lifecycle-boundary-2026-06-12.md)
- [Semantic canvas edge projection lifecycle](./semantic-canvas-edge-projection-lifecycle-2026-06-12.md)
